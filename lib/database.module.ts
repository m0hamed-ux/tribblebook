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