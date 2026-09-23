import type { LucideIcon } from "lucide-react";

import {
  Archive,
  ArchiveRestore,
  EyeOff,
  FilePen,
  FilePlus,
  Globe,
  RotateCcw,
  Trash2,
} from "lucide-react";

import type { ActivityEventType } from "@repo/api-client";

export const ACTIVITY_EVENT_CONFIG: Record<ActivityEventType, { icon: LucideIcon; verb: string }> =
  {
    "guide.created": { icon: FilePlus, verb: "created" },
    "guide.updated": { icon: FilePen, verb: "updated" },
    "guide.published": { icon: Globe, verb: "published" },
    "guide.unpublished": { icon: EyeOff, verb: "unpublished" },
    "guide.archived": { icon: Archive, verb: "archived" },
    "guide.unarchived": { icon: ArchiveRestore, verb: "unarchived" },
    "guide.deleted": { icon: Trash2, verb: "deleted" },
    "guide.restored": { icon: RotateCcw, verb: "restored" },
  };
