import { useState, useEffect } from 'react';
import { Modal } from './Modal'; // This is a named import
import { LoadingSpinner } from './LoadingSpinner'; // This is a named import
import { api } from '../services/api';
import { Vendor } from '../types';

interface CreateTokenModalProps {
  onClose: () => void;
  onSuccess: (token: any) => void; // Replace 'any' with your Token type
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

// This component uses 'export default'
export default function CreateTokenModal({ onClose, onSuccess }: CreateTokenModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true); // For loading vendors
  const [submitLoading, setSubmitLoading] = useState(false); // For form submission

  useEffect(() => {
    const loadVendors = async () => {
      try {
        setPageLoading(true);
        setError('');
        const data = await api.getVendors();
        setVendors(data);
      } catch (error) {
        setError('Failed to load vendors');
      } finally {
        setPageLoading(false);
      }
    };
    loadVendors();
  }, []);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const availableServices = selectedVendor?.services || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError('');

    // Validate file types
    const invalidFiles = selectedFiles.filter(file => {
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return !ALLOWED_EXTENSIONS.includes(extension);
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type. Only PDF and DOCX files are allowed.`);
      return;
    }

    // Validate total size
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      setError(`Total file size exceeds 20MB. Current size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    setFiles(selectedFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount > 100) {
      setError(`Description must be under 100 words (currently ${wordCount} words)`);
      return;
    }

    setSubmitLoading(true);

    try {
      // Pass files directly to the API
      const token = await api.createToken(
        selectedVendorId,
        serviceType,
        subject,
        description,
        undefined, // params (will be merged on backend with uploaded files)
        files.length > 0 ? files : undefined // Pass actual File objects
      );
      
      onSuccess(token);
      onClose();
    } catch (err: any) {
      // Handle validation errors from backend
      if (err.message && err.message.includes('Validation failed')) {
        setError('Validation failed. Please check all fields.');
      } else {
        setError(err.message || 'Failed to create request');
      }
      console.error('Create token error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const isFormValid = selectedVendorId && serviceType && subject.trim() && description.trim();

  return (
    <Modal title="New Service Request" onClose={onClose}>
      {pageLoading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="vendor" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Select Vendor
            </label>
            <select
              id="vendor"
              value={selectedVendorId}
              onChange={(e) => {
                setSelectedVendorId(e.target.value);
                setServiceType('');
              }}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" className="text-zinc-900 dark:text-zinc-100">-- Choose a vendor --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id} className="text-zinc-900 dark:text-zinc-100">
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Details Preview */}
          {selectedVendor && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Vendor Information</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-300">Name:</span>
                    <span className="ml-2 text-blue-800 dark:text-blue-400">{selectedVendor.name}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-300">Email:</span>
                    <span className="ml-2 text-blue-800 dark:text-blue-400">{selectedVendor.email}</span>
                  </div>
                </div>

                {selectedVendor.phoneNumber && (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <span className="font-medium text-blue-900 dark:text-blue-300">Phone:</span>
                      <span className="ml-2 text-blue-800 dark:text-blue-400">{selectedVendor.phoneNumber}</span>
                    </div>
                  </div>
                )}

                {selectedVendor.address && (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <span className="font-medium text-blue-900 dark:text-blue-300">Address:</span>
                      <span className="ml-2 text-blue-800 dark:text-blue-400">{selectedVendor.address}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium text-blue-900 dark:text-blue-300">Services:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedVendor.services.map((service: string, index: number) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 text-xs rounded-md capitalize"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedVendorId && (
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Service Type
              </label>
              <select
                id="service"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="" className="text-zinc-900 dark:text-zinc-100">-- Choose a service --</option>
                {availableServices.map((service: string) => (
                  <option key={service} value={service} className="capitalize text-zinc-900 dark:text-zinc-100">
                    {service}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief title for your request"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description (Max 100 words)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe your service request in detail..."
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {description.trim() ? description.trim().split(/\s+/).length : 0} / 100 words
            </p>
          </div>

          {/* File Upload Section */}
          <div>
            <label htmlFor="files" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Attach Files (Optional)
            </label>
            <input
              id="files"
              type="file"
              multiple
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Max 20MB total. Allowed: PDF, DOCX only
            </p>
            
            {/* Display selected files */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-2 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                      aria-label="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Total size: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))} / 20MB
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading || !isFormValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitLoading ? <LoadingSpinner /> : 'Create Request'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

