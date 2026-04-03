export interface AppUser {
  _id?: string;
  id?: string;
  role?: string;
  photoURL?: string;
}

export interface LikeItem {
  user?: string;
}

export interface ReactionItem {
  user?: string;
  type?: string;
}

export interface CommentAuthor {
  _id?: string;
  name?: string;
  username?: string;
  photoURL?: string;
}

export interface MentionPayload {
  user: string;
  startIndex: number;
  endIndex: number;
}

export interface ReplyItem {
  _id: string;
  author?: CommentAuthor;
  message: string;
  createdAt?: string | Date;
  likes?: LikeItem[];
  reactions?: ReactionItem[];
  edited?: {
    isEdited?: boolean;
    editedAt?: string | Date;
  };
}

export interface CommentItem {
  _id: string;
  author?: CommentAuthor;
  message: string;
  createdAt?: string | Date;
  likes?: LikeItem[];
  reactions?: ReactionItem[];
  edited?: {
    isEdited?: boolean;
    editedAt?: string | Date;
  };
  replies?: ReplyItem[];
}

export interface DeleteModalState {
  isOpen: boolean;
  commentId: string | null;
  replyId: string | null;
  loading: boolean;
}

export interface EditState {
  commentId: string | null;
  replyId: string | null;
  value: string;
  loading: boolean;
}

export interface UseAppShape {
  user?: AppUser | null;
}

export interface JobCommentsPanelProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  initialCommentCount?: number;
}

export interface CommentReplyItemProps {
  reply: ReplyItem;
  currentUserId: string;
  isAdmin: boolean;
  showDropdown: string | null;
  editState: EditState;
  onDropdownToggle: (id: string | null) => void;
  onStartEditing: (message: string, replyId: string) => void;
  onOpenDeleteModal: (replyId: string) => void;
  onSaveEdit: () => Promise<void>;
  onCancelEditing: () => void;
  onSetEditState: import('react').Dispatch<import('react').SetStateAction<EditState>>;
  onLike: (replyId: string) => void;
  onReplyTo: (authorName: string) => void;
  onReact: (type: string, replyId: string) => void;
}

export interface CommentItemCardProps {
  comment: CommentItem;
  currentUserId: string;
  isAdmin: boolean;
  showDropdown: string | null;
  editState: EditState;
  expandedComments: Set<string>;
  replyingTo: string | null;
  replyText: string;
  replyingToUser: string | null;
  userPhotoURL: string | undefined;
  onSetShowDropdown: (id: string | null) => void;
  onStartEditing: (commentId: string, message: string, replyId?: string) => void;
  onOpenDeleteModal: (commentId: string, replyId?: string) => void;
  onSaveEdit: () => Promise<void>;
  onCancelEditing: () => void;
  onSetEditState: import('react').Dispatch<import('react').SetStateAction<EditState>>;
  onLikeComment: (commentId: string, replyId?: string) => Promise<void>;
  onToggleReplyTo: (commentId: string, username?: string) => void;
  onSetReplyText: (text: string) => void;
  onReplyInputKeyDown: (e: import('react').KeyboardEvent<HTMLInputElement>, commentId: string) => void;
  onPostReply: (commentId: string) => Promise<void>;
  onReact: (commentId: string, type: string, replyId?: string) => Promise<void>;
  onToggleExpanded: (commentId: string) => void;
}
