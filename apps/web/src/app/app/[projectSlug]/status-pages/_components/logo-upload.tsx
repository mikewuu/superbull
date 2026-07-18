'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { generateLogoUploadUrlAction, setStatusPageLogoAction } from '../actions';

interface LogoUploadProps {
  projectSlug: string;
  configId: string;
  connectorId: string;
  hasLogo: boolean;
}

export function LogoUpload(props: LogoUploadProps) {
  const { projectSlug, configId, connectorId, hasLogo } = props;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const uploadUrl = await generateLogoUploadUrlAction(projectSlug);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const { storageId } = (await response.json()) as { storageId: string };
      await setStatusPageLogoAction(projectSlug, { configId, connectorId, storageId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="candy-card rounded-lg p-4">
      <h2 className="text-sm font-medium text-content-emphasis">Logo</h2>
      <div className="mt-3 space-y-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Logo preview"
            className="h-16 w-auto rounded-lg border border-border-subtle"
          />
        ) : (
          hasLogo && (
            <p className="flex items-center gap-1.5 text-xs text-content-subtle">
              <span className="size-1.5 rounded-full bg-candy-green" />
              Logo uploaded
            </p>
          )
        )}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={handleFileChange}
          className="block w-full text-xs text-content-subtle file:mr-2 file:rounded-lg file:border file:border-border-subtle file:bg-bg-default file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-content-emphasis"
        />
      </div>
    </div>
  );
}
