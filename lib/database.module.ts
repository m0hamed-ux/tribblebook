export interface StoryProps {
    image: string | any;
}

export interface UserProps {
    id?: string | number,
    username: string,
    fullname: string,
    profile: string | any,
    /** ISO string when the user was last seen online */
    last_seen?: string | Date,
    followers?: Array<UserProps | null>,
    following?: Array<UserProps | null>,
    birthdate?: Date,
    bio?: string,
    private?: boolean | false,
    verified?: boolean | false,
}

export interface CommunityProps {
    id: number,
    name: string,
    description?: string,
    banner?: string | any,
    profile?: string | any,
    members?: Array<{user_id: UserProps} | null> | [],
    community_admin?: UserProps | null,
}

export interface PostProps {
    id?: number,
    author?: UserProps,
    title: string,
    content?: string,
    images?: string[],
    video?: string,
    links?: string,
    created_at?: string | Date,
    likes?: Array<{user_id: UserProps | null}>,
    isLiked?: boolean,
    comment_count?: number,
    community?: CommunityProps | null,
    reposted_post?: PostProps  
}

export interface CommentProps {
    id: number,
    post_id: number,
    author: UserProps,
    content: string,
    parent_id?: number | null,
    reply_to_username?: string | null,
    created_at: string,
    likes?: Array<{user_id: UserProps} | null>,
    replies?: Array<CommentProps | null>,
}

export interface StoryViewProps {
    id?: string | number;
    /** ISO datetime string when the story was created */
    createdAt?: string;
    /** Canvas size used when composing the story */
    canvas?: { width: number; height: number };
    /** Picked media (image or video) */
    media?: {
        uri: string;
        type: 'image' | 'video';
        /** seconds for videos (undefined for images) */
        durationSec?: number;
    };
    /** Transform applied to the background media */
    mediaTransform?: {
        translateX: number;
        translateY: number;
        scale: number;
        /** rotation in degrees */
        rotation: number;
    };
    /** Text overlays placed on top of the media */
    texts?: Array<{
        /** optional client-side id; backend may assign its own */
        id?: string;
        text: string;
        transform: {
            translateX: number;
            translateY: number;
            scale: number;
            /** rotation in degrees */
            rotation: number;
        };
        style: {
            color: string;
            /** can be 'transparent' or any rgba/hex color string */
            backgroundColor: string;
            shadow: boolean;
            fontSize: number;
            fontWeight: 'normal' | 'bold';
            /** optional, platform dependent */
            fontFamily?: string;
        };
    }>;
    /** Optional author metadata */
    author?: UserProps;
    /** Whether the current user has viewed this story */
    isViewed?: boolean;
}

// (All supporting types are intentionally inlined above to keep the definition in one place.)

export interface StoryGroupProps {
    author: UserProps;
    stories: StoryViewProps[];
}

export interface StoryViewerData {
    id: string | number;
    viewedAt: string;
    reaction?: string;
    user: UserProps;
}

export interface StoryViewersResponse {
    storyId: string | number;
    totalViews: number;
    reactionSummary: Record<string, number>;
    viewers: StoryViewerData[];
}

// Notifications
export type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'save' | 'system'
export type NotificationTargetType = 'post' | 'comment' | 'story' | 'community' | 'user' | 'system'

export interface NotificationProps {
    id: string | number
    recipient_id: string | number
    actor_id: string | number
    type: NotificationType
    target_type: NotificationTargetType
    target_id: string | number
    message: string
    is_read: boolean
    created_at: string
    // Joined actor info (backend shape per SQL in GET /notifications)
    actor?: Pick<UserProps, 'id' | 'username' | 'fullname' | 'profile'>
}

// Follow requests
export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected'
export interface FollowRequest {
    id: string | number
    requester_id: string | number
    target_id: string | number
    status: FollowRequestStatus
    created_at: string
    // joins
    requester?: Pick<UserProps, 'id' | 'username' | 'fullname' | 'profile' | 'verified'>
    target?: Pick<UserProps, 'id' | 'username' | 'fullname' | 'profile' | 'verified'>
}

// Verification requests
export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected'
export interface VerificationRequest {
    id: string | number
    user_id: string | number
    request_message: string
    status: VerificationRequestStatus
    created_at: string
    reviewed_at?: string | null
}
