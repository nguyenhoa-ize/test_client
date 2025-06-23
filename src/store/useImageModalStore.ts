import { create } from 'zustand';

interface ImageModalState {
  isOpen: boolean;
  imageUrl: string | null;
  openModal: (imageUrl: string) => void;
  closeModal: () => void;
}

export const useImageModalStore = create<ImageModalState>((set) => ({
  isOpen: false,
  imageUrl: null,
  openModal: (imageUrl) => set({ isOpen: true, imageUrl }),
  closeModal: () => set({ isOpen: false, imageUrl: null }),
})); 