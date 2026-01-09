
export interface Participant {
  id: string;
  name: string;
  stream: MediaStream;
  isMe?: boolean;
}
