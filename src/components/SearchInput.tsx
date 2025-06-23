import { FC, useState } from 'react';
import { MaterialIcon } from './MaterialIcon';

interface SearchInputProps {
  onSearch: (query: string) => void;
}

export const SearchInput: FC<SearchInputProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Tìm kiếm hội thoại..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          aria-label="Clear search"
        >
          <MaterialIcon icon="close" />
        </button>
      )}
    </div>
  );
};