import { Blobatar, type BlobatarProps } from "@/components/ui/blobatar";

type AvatarUser = { id: string; name: string; image?: string | null };

type Props = Omit<BlobatarProps, "name" | "src" | "alt"> & { user: AvatarUser };

export function UserAvatar({ user, ...props }: Props) {
  return <Blobatar name={user.id} src={user.image ?? undefined} alt={user.name} {...props} />;
}
