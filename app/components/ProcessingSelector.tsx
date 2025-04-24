import { processingTypes } from "~/utils/imageProcessing";

interface ProcessingSelectorProps {
  selectedType: string;
  onChange: (value: string) => void;
}

export default function ProcessingSelector({ selectedType, onChange }: ProcessingSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full max-w-xs">
      <label 
        htmlFor="processing-type" 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Processing Type
      </label>
      <select
        id="processing-type"
        className="block w-full rounded-md border-gray-300 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        value={selectedType}
        onChange={handleChange}
      >
        {processingTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
} 