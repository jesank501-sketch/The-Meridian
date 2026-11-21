import React, { useRef, useState } from 'react';
import { Check, Edit3, Film, Search, Trash2, Upload, X } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  removeMedia,
  updateMediaMetadata,
  uploadMediaFile,
} from '../../lib/firestoreService';
import { SafeImage } from '../common/SafeImage';
import type { MediaAsset } from '../../types/portal';

interface MediaLibraryProps {
  pickerMode?: boolean;
  onSelect?: (asset: MediaAsset) => void;
  onClose?: () => void;
}

export function MediaLibraryManager({ pickerMode = false, onSelect, onClose }: MediaLibraryProps) {
  const { media, currentUser, isEditor } = usePortal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editForm, setEditForm] = useState({ title: '', altText: '', caption: '' });

  const filtered = media.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.fileName.toLowerCase().includes(q) ||
      (m.altText || '').toLowerCase().includes(q)
    );
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    setErrorMsg('');
    setSuccessMsg('');
    setUploading(true);
    try {
      let count = 0;
      for (const file of Array.from(files)) {
        const asset = await uploadMediaFile(file, { title: file.name.replace(/\.[^.]+$/, '') }, currentUser);
        count += 1;
        if (pickerMode && count === 1 && onSelect) {
          onSelect(asset);
          return;
        }
      }
      setSuccessMsg(`Uploaded ${count} media file${count > 1 ? 's' : ''} successfully.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = (asset: MediaAsset) => {
    setEditing(asset);
    setEditForm({
      title: asset.title,
      altText: asset.altText || '',
      caption: asset.caption || '',
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !currentUser) return;
    await updateMediaMetadata(editing.id, editForm, currentUser);
    setEditing(null);
    setSuccessMsg('Media details updated.');
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!currentUser) return;
    await removeMedia(asset.id, asset.title, currentUser);
    setSuccessMsg(`Removed "${asset.title}".`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {pickerMode ? 'Select Media Asset' : 'Media Library'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Upload images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM) up to 12MB.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Media'}</span>
          </button>
          {pickerMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-stone-300 dark:border-stone-700 rounded text-stone-600 dark:text-stone-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded">
          {successMsg}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files by title or alt text..."
          className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-stone-300 dark:border-stone-700 rounded text-sm text-stone-500">
          No media assets found. Upload an image or video above.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => {
            const isVideo = asset.mimeType.startsWith('video/');
            const canDelete = isEditor || asset.uploadedBy === currentUser?.uid;
            return (
              <div
                key={asset.id}
                className="border border-stone-200 dark:border-stone-800 rounded overflow-hidden bg-white dark:bg-stone-900 flex flex-col"
              >
                <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-800 relative overflow-hidden">
                  {isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-500">
                      <Film className="w-8 h-8 mb-1" />
                      <span className="text-xs px-2 truncate max-w-full">{asset.fileName}</span>
                    </div>
                  ) : (
                    <SafeImage
                      src={asset.url}
                      alt={asset.altText || asset.title}
                      fallbackTitle={asset.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {asset.title}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5 tabular-nums">
                      {(asset.sizeBytes / 1024).toFixed(0)} KB · {asset.mimeType.split('/')[1]}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    {pickerMode && onSelect ? (
                      <button
                        type="button"
                        onClick={() => onSelect(asset)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
                      >
                        <Check className="w-3.5 h-3.5" /> Select
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(asset)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(asset)}
                            className="p-1.5 text-red-600 border border-stone-300 dark:border-stone-700 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete media"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Edit Media Metadata</h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Alt Text (SEO & Accessibility)</label>
              <input
                type="text"
                value={editForm.altText}
                onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Editorial Caption</label>
              <textarea
                rows={2}
                value={editForm.caption}
                onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
              >
                Save Metadata
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function MediaPickerModal({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
        <MediaLibraryManager
          pickerMode
          onSelect={(asset) => {
            onSelect(asset);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
