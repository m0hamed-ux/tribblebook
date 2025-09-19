export interface StoryProps {
    image: string | any;
}

export interface UserProps {
    username: string,
    fullname: string,
    profile: string | any,
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
