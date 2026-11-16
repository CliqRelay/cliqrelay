import Avvvatars from "avvvatars-react";

type Props = {
  user: {
    id: string;
  };
  avatar?: {
    // These params are copied from the library as it doesn't export the interface/type.
    displayValue?: string;
    size?: number;
    shadow?: boolean;
    border?: boolean;
    borderSize?: number;
    borderColor?: string;
    radius?: number;
  };
};

export function UserAvatar({ user, avatar }: Props) {
  return <Avvvatars value={user.id} style="shape" {...avatar} />;
}
