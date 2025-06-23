import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import axios from "axios";
import gsap from "gsap";
import { useUser } from "@/contexts/UserContext";
import imageCompression from "browser-image-compression";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface EditProfileModalProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    bio?: string;
    avatar_url?: string;
    cover_url?: string;
    email: string;
    created_at?: string;
  };
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const useImageUpload = (accessToken: string) => {
  const { refreshAccessToken } = useUser();

  const compressImage = useCallback(
    async (file: File, maxWidthOrHeight: number): Promise<File> => {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight,
      });
      if (compressedFile.size > 5 * 1024 * 1024)
        throw new Error("Kích thước file vượt quá 5MB");
      return compressedFile;
    },
    []
  );

  const uploadImage = useCallback(
    async (
      file: File,
      setProgress: (percent: number) => void
    ): Promise<string> => {
      const formData = new FormData();
      formData.append("image", file);
      let currentToken = accessToken;
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${currentToken}`,
            },
            onUploadProgress: (e) =>
              e.total && setProgress(Math.round((e.loaded * 100) / e.total)),
          }
        );
        return response.data.url || "";
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            currentToken = sessionStorage.getItem("accessToken") || "";
            const retryResponse = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${currentToken}`,
                },
                onUploadProgress: (e) =>
                  e.total && setProgress(Math.round((e.loaded * 100) / e.total)),
              }
            );
            return retryResponse.data.url || "";
          }
        }
        throw err;
      }
    },
    [accessToken, refreshAccessToken]
  );

  return { compressImage, uploadImage };
};

const handlePostUpdate = async (
  userId: string,
  accessToken: string,
  content: string,
  images: string[],
  avatarChanged: boolean,
  coverChanged: boolean
) => {
  if (avatarChanged || coverChanged) {
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/posts`,
      {
        user_id: userId,
        content,
        images,
        type_post: "positive",
        is_approved: true,
        privacy: "public",
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }
};

const EditProfileModal = memo(
  ({ user, accessToken, onClose, onSuccess }: EditProfileModalProps) => {
    EditProfileModal.displayName = "EditProfileModal";
    const { setUserData } = useUser();
    const { compressImage, uploadImage } = useImageUpload(accessToken);
    const [firstName, setFirstName] = useState(user.first_name ?? "");
    const [lastName, setLastName] = useState(user.last_name ?? "");
    const [bio, setBio] = useState(user.bio ?? "");
    const [avatar, setAvatar] = useState<File | null>(null);
    const [cover, setCover] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url ?? "");
    const [coverPreview, setCoverPreview] = useState(user.cover_url ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const coverRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const logError = useCallback((step: string, err: unknown) => {
      console.error(`[EditProfileModal] Error at ${step}:`, err);
      setError(
        `Lỗi tại ${step}: ${
          err instanceof Error ? err.message : "Vui lòng thử lại"
        }`
      );
      toast.error(err instanceof Error ? err.message : "Vui lòng thử lại", {
        autoClose: 5000,
      });
    }, []);

    const handleImageChange = useCallback(
      async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "avatar" | "cover"
      ) => {
        if (e.target.files?.[0]) {
          const file = e.target.files[0];
          if (!file.type.startsWith("image/")) {
            setError("Chỉ hỗ trợ file ảnh (jpg, png, ...)");
            toast.error("Chỉ hỗ trợ file ảnh (jpg, png, ...)");
            return;
          }
          try {
            const compressedFile = await compressImage(
              file,
              type === "avatar" ? 1024 : 1920
            );
            if (type === "avatar") {
              setAvatar(compressedFile);
              setAvatarPreview(URL.createObjectURL(compressedFile));
            } else {
              setCover(compressedFile);
              setCoverPreview(URL.createObjectURL(compressedFile));
            }
            setError(null);
            toast.success(
              `Đã chọn ảnh ${type === "avatar" ? "đại diện" : "bìa"}`
            );
          } catch (err) {
            logError(`nén ảnh ${type}`, err);
          }
        }
      },
      [compressImage, logError]
    );

    const handleSave = useCallback(async () => {
      setLoading(true);
      setError(null);
      let avatarUrl = user.avatar_url;
      let coverUrl = user.cover_url;
      let avatarChanged = false;
      let coverChanged = false;

      try {
        if (avatar) {
          const url = await uploadImage(avatar, (p) =>
            setError(`Đang tải ảnh đại diện: ${p}%`)
          );
          avatarUrl = url;
          avatarChanged = true;
        }
        if (cover) {
          const url = await uploadImage(cover, (p) =>
            setError(`Đang tải ảnh bìa: ${p}%`)
          );
          coverUrl = url;
          coverChanged = true;
        }

        const payload = {
          first_name: firstName,
          last_name: lastName,
          bio,
          avatar_url: avatarUrl,
          email: user.email,
          cover_url: coverChanged ? coverUrl : user.cover_url, // Gửi cover_url hiện tại nếu không thay đổi
        };

        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/${user.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        setUserData(response.data.user, accessToken);

        if (avatarChanged || coverChanged) {
          let content = "";
          const images: string[] = [];
          if (avatarChanged && coverChanged) {
            content = "đã cập nhật ảnh đại diện và ảnh bìa";
            images.push(...[avatarUrl, coverUrl].filter(Boolean) as string[]);
          } else if (avatarChanged) {
            content = "đã cập nhật ảnh đại diện";
            images.push(avatarUrl as string);
          } else if (coverChanged) {
            content = "đã cập nhật ảnh bìa";
            images.push(coverUrl as string);
          }
          await handlePostUpdate(
            user.id,
            accessToken,
            content,
            images,
            avatarChanged,
            coverChanged
          );
        }

        toast.success("Cập nhật thành công!");
        setTimeout(onSuccess, 300);
      } catch (err) {
        logError("lưu thay đổi", err);
      } finally {
        setLoading(false);
      }
    }, [
      user,
      accessToken,
      firstName,
      lastName,
      bio,
      avatar,
      cover,
      uploadImage,
      setUserData,
      onSuccess,
      logError,
    ]);

    useEffect(() => {
      if (modalRef.current) {
        gsap.fromTo(
          modalRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
        );
      }
    }, []);

    useEffect(() => {
      if (coverRef.current) {
        gsap.fromTo(
          coverRef.current,
          { scale: 0.98, opacity: 0.7 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out" }
        );
      }
      if (avatarRef.current) {
        gsap.fromTo(
          avatarRef.current,
          { scale: 0.95, opacity: 0.7 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out" }
        );
      }
    }, [coverPreview, avatarPreview]);

    useEffect(() => {
      const handleFocus = (e: any) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          gsap.to(e.target, { y: -5, duration: 0.3, ease: "power1.out" });
        }
      };
      const handleBlur = (e: any) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          gsap.to(e.target, { y: 0, duration: 0.3, ease: "power1.in" });
        }
      };
      document.querySelectorAll("input, textarea").forEach((el) => {
        el.addEventListener("focus", handleFocus);
        el.addEventListener("blur", handleBlur);
      });
      return () => {
        document.querySelectorAll("input, textarea").forEach((el) => {
          el.removeEventListener("focus", handleFocus);
          el.removeEventListener("blur", handleBlur);
        });
      };
    }, []);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50"
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative overflow-hidden transform transition-all duration-300"
          tabIndex={-1}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 focus:outline-none"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Chỉnh sửa thông tin cá nhân
          </h2>
          <div
            ref={coverRef}
            className={`relative w-full h-32 rounded-lg overflow-hidden mb-4 ${
              !coverPreview ? "bg-white" : ""
            }`}
          >
            {coverPreview ? (
              <Image
                src={coverPreview}
                alt="Ảnh bìa"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                Chưa có ảnh bìa
              </div>
            )}
            <label
              htmlFor="cover-input"
              className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-indigo-50 focus:outline-none"
              title="Thay đổi ảnh bìa"
            >
              <input
                id="cover-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, "cover")}
                disabled={loading}
                aria-label="Chọn ảnh bìa"
              />
              <span className="material-symbols-outlined text-lg">
                photo_camera
              </span>
            </label>
          </div>
          <div className="flex justify-center -mt-12 mb-4">
            <div
              ref={avatarRef}
              className="relative w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden z-10"
              style={{ marginTop: "-40px" }}
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Ảnh đại diện"
                  fill
                  className="object-cover rounded-full"
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-gray-400">
                  person
                </span>
              )}
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-indigo-50 focus:outline-none"
                title="Thay đổi ảnh đại diện"
              >
                <input
                  id="avatar-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, "avatar")}
                  disabled={loading}
                  aria-label="Chọn ảnh đại diện"
                />
                <span className="material-symbols-outlined text-lg">
                  photo_camera
                </span>
              </label>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Họ
                </label>
                <input
                  id="firstName"
                  type="text"
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nhập họ của bạn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tên
                </label>
                <input
                  id="lastName"
                  type="text"
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nhập tên của bạn"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700"
              >
                Tiểu sử
              </label>
              <textarea
                id="bio"
                className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                placeholder="Giới thiệu bản thân..."
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 400))}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 text-right">
                {bio.length}/400
              </p>
            </div>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 transition-all duration-200"
              disabled={loading}
              onMouseEnter={(e) =>
                gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2 })
              }
              onMouseLeave={(e) =>
                gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })
              }
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    progress_activity
                  </span>
                  Đang xử lý...
                </span>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </form>
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      </div>
    );
  }
);

export default EditProfileModal;