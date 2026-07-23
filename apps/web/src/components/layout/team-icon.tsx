type Props = {
	name: string;
};

export default function TeamIcon({ name }: Props) {
	return (
		<span className="p-2 bg-sky-500 rounded-md">{name.substring(0, 1)}</span>
	);
}
