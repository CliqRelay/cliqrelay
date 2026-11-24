import { useEffect, useState } from "react";

export type BlobEntry = {
  id: string;
  blob: Blob;
};

/**
 * Creates an object URL for a blob and revokes it when the blob changes or the
 * component unmounts. Pending step screenshots live in Dexie as blobs, so this
 * is the only way to render them without uploading first.
 */
export const useObjectUrl = (blob: Blob | null | undefined): string | undefined => {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blob) {
      // oxlint-disable-next-line react/set-state-in-effect -- clearing the URL when the blob disappears.
      setUrl(undefined);
      return;
    }

    const nextUrl = URL.createObjectURL(blob);
    // oxlint-disable-next-line react/set-state-in-effect -- the URL only exists once the blob arrives from Dexie.
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  return url;
};

/**
 * Batch variant used while mapping a session's steps. The `blobs` array comes
 * from a single `useLiveQuery` result, so its identity only changes when Dexie
 * publishes a new snapshot.
 */
export const useBlobObjectUrls = (blobs: readonly BlobEntry[]): Record<string, string> => {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const entry of blobs) {
      next[entry.id] = URL.createObjectURL(entry.blob);
    }
    // oxlint-disable-next-line react/set-state-in-effect -- object URLs are derived from Dexie snapshots.
    setUrls(next);

    return () => {
      for (const url of Object.values(next)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [blobs]);

  return urls;
};
