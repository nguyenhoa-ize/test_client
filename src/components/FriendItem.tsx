// Định nghĩa interface cho props của FriendItem
interface FriendItemProps {
  name: string; /* Tên của bạn bè */
}

// Component FriendItem hiển thị thông tin một người bạn
const FriendItem = ({ name }: FriendItemProps) => {
  return (
    // Container cho mỗi người bạn với hover effect
    <div className="flex items-center p-2 hover:bg-gray-100 rounded">
      {/* Avatar placeholder */}
      <div className="w-8 h-8 rounded-full bg-gray-200 mr-2" />
      {/* Tên người bạn */}
      <span className="text-gray-800">{name}</span>
      {/* Trạng thái online */}
      <div className="w-3 h-3 bg-green-500 rounded-full ml-auto" />
    </div>
  );
};

export default FriendItem;