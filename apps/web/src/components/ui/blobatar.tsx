import type * as React from "react";

import { Blobatar as Generated } from "@blobatar/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;

type GeneratedOptions = DistributiveOmit<
	React.ComponentProps<typeof Generated>,
	"name"
>;

export type BlobatarProps = React.ComponentProps<typeof Avatar> & {
	name: string;
	src?: string;
	alt?: string;
	blobatar?: GeneratedOptions;
};

export function Blobatar({
	name,
	src,
	alt,
	blobatar,
	children,
	...props
}: BlobatarProps) {
	return (
		<Avatar {...props}>
			{src ? <AvatarImage src={src} alt={alt ?? name} /> : null}
			<AvatarFallback className="bg-transparent">
				<Generated {...blobatar} name={name} className="size-full" />
			</AvatarFallback>
			{children}
		</Avatar>
	);
}
