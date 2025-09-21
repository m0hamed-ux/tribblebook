import type { VerificationRequest } from "@/lib/database.module";
import { CommentProps, CommunityProps, FollowRequest, NotificationProps, NotificationTargetType, NotificationType, PostProps, StoryViewProps, StoryViewersResponse, UserProps } from "@/lib/database.module";

export async function getPosts(){
    try{
        const posts = await fetch("https://tribblebook-backend.onrender.com/posts")
        return await posts.json() as PostProps[]
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function getUserPosts(username: string){
    try{
        const posts = await fetch(`https://tribblebook-backend.onrender.com/u/${username}/posts`)
        return await posts.json() as PostProps[]
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function getReels(){
    try{
        const posts = await fetch("https://tribblebook-backend.onrender.com/posts/reels")
        return await posts.json() as PostProps[]
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function handleLike(post_id: number, userId: string){
    console.log("like function called")
    if(!userId) {console.log("no user"); return null }
    try{
        console.log("handling like for post:", post_id)
        const response = await fetch(`https://tribblebook-backend.onrender.com/posts/${post_id}/handleLike`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            }
        })
        console.log("like response status:", response.status)
        if(response.ok){
            const data = await response.json()
            console.log("like response data:", data)
            return data
        } else {
            console.log("like request failed:", response.statusText)
            return null
        }
    } catch (error) {
        console.log("like error:", error)
        return null
    }
}

export async function getPostComments(post_id: number) {
    try{
        const comments = await fetch(`https://tribblebook-backend.onrender.com/posts/${post_id}/comments`)
        console.log("fetched comments for post", post_id, ":", comments)
        return await comments.json() as Array<CommentProps>
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function handleCommentLike(comment_id: number, userId: string){
    console.log("comment like function called")
    if(!userId) {console.log("no user"); return null }
    try{
        console.log("handling like for comment:", comment_id)
        const response = await fetch(`https://tribblebook-backend.onrender.com/comments/${comment_id}/handleLike`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            }
        })
        console.log("comment like response status:", response.status)
        if(response.ok){
            const data = await response.json()
            console.log("comment like response data:", data)
            return data
        } else {
            console.log("comment like request failed:", response.statusText)
            return null
        }
    } catch (error) {
        console.log("comment like error:", error)
        return null
    }
}

export async function handleCommentUnlike(comment_id: number, userId: string){
    console.log("comment unlike function called")
    if(!userId) {console.log("no user"); return null }
    try{
        console.log("handling unlike for comment:", comment_id)
        const response = await fetch(`https://tribblebook-backend.onrender.com/comments/${comment_id}/handleUnlike`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            }
        })
        console.log("comment unlike response status:", response.status)
        if(response.ok){
            const data = await response.json()
            console.log("comment unlike response data:", data)
            return data
        } else {
            console.log("comment unlike request failed:", response.statusText)
            return null
        }
    } catch (error) {
        console.log("comment unlike error:", error)
        return null
    }
}

export async function getUser(username: string){
    try{
        const user = await fetch(`https://tribblebook-backend.onrender.com/u/${username}`)
        return await user.json() as UserProps
    } catch (error) {
        console.log(error)
        return null
    }
}

// Follow/Unfollow and Followers/Following APIs
export async function followUser(targetUserId: string | number, userId: string) {
    if (!userId) return { success: false } as const
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/follow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (res.ok) return { success: true } as const
        const body = await safeReadText(res)
        console.log('follow user failed:', res.status, res.statusText, body)
        return { success: false } as const
    } catch (e) {
        console.log('follow user error:', e)
        return { success: false } as const
    }
}

export async function unfollowUser(targetUserId: string | number, userId: string) {
    if (!userId) return { success: false } as const
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/follow`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (res.ok) return { success: true } as const
        const body = await safeReadText(res)
        console.log('unfollow user failed:', res.status, res.statusText, body)
        return { success: false } as const
    } catch (e) {
        console.log('unfollow user error:', e)
        return { success: false } as const
    }
}

export async function getFollowers(targetUserId: string | number) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/followers`)
        if (res.ok) {
            return await res.json() as UserProps[]
        } else {
            const body = await safeReadText(res)
            console.log('get followers failed:', res.status, res.statusText, body)
            return [] as UserProps[]
        }
    } catch (e) {
        console.log('get followers error:', e)
        return [] as UserProps[]
    }
}

export async function getFollowing(targetUserId: string | number) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/following`)
        if (res.ok) {
            return await res.json() as UserProps[]
        } else {
            const body = await safeReadText(res)
            console.log('get following failed:', res.status, res.statusText, body)
            return [] as UserProps[]
        }
    } catch (e) {
        console.log('get following error:', e)
        return [] as UserProps[]
    }
}

export async function createPost(title: string, content: string, userId: string, images?: string[], video?: string, links?: string, community?: string | number, reposted_post: string | number | null = null){
    try{
        const response = await fetch("https://tribblebook-backend.onrender.com/create/post", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
                body: JSON.stringify({ title, content, images, video, links, community, communityId: community, reposted_post })
        })
        if(response.ok){
            const data = await response.json()
            return data
        } else {
            console.log("create post failed:", response.statusText)
            return null
        }
    } catch (error) {
        console.log("create post error:", error)
        return null
    }
}

export async function getCommunities(){
    try{
        const communities = await fetch("https://tribblebook-backend.onrender.com/communities")
        return await communities.json()
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function getCommunity(id: string){
    try{
        const community = await fetch(`https://tribblebook-backend.onrender.com/communities/${id}`)
        return await community.json()
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function getCommunityPosts(id: string){
    try{
        const posts = await fetch(`https://tribblebook-backend.onrender.com/communities/${id}/posts`)
        return await posts.json() as PostProps[]
    } catch (error) {
        console.log(error)
        return []
    }
}

export async function joinCommunity(communityId: string, userId: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/communities/${communityId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            // Some backends return 204 No Content. Treat any 2xx as success without parsing.
            return true
        } else {
            const body = await safeReadText(response)
            console.log("join community failed:", response.status, response.statusText, body)
            return false
        }
    } catch (error) {
        console.log("join community error:", error)
        return false
    }
}

export async function leaveCommunity(communityId: string, userId: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/communities/${communityId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            // Some backends return 204 No Content. Treat any 2xx as success without parsing.
            return true
        } else {
            const body = await safeReadText(response)
            console.log("leave community failed:", response.status, response.statusText, body)
            return false
        }
    } catch (error) {
        console.log("leave community error:", error)
        return false
    }
}

async function safeReadText(response: Response) {
    try {
        return await response.text()
    } catch {
        return ''
    }
}

export async function search(query: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/search?q=${encodeURIComponent(query)}`)
        if (response.ok) {
            return await response.json() as { users: UserProps[], communities: CommunityProps[], posts: PostProps[] }
        } else {
            console.log("search failed:", response.statusText)
            return { users: [], communities: [], posts: [] }
        }
    } catch (error) {
        console.log("search error:", error)
        return { users: [], communities: [], posts: [] }
    }
}

export async function getTrendingPosts(){
    try{
        const posts = await fetch("https://tribblebook-backend.onrender.com/trending")
        return await posts.json() as PostProps[]
    } catch (error) {
        console.log(error)
        return []
    }
}

// Communities management for current user
export async function getMyCommunities(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/user/communities', {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json() as {
                admin_communities: Array<any>
                member_communities: Array<any>
            }
        } else {
            const body = await safeReadText(res)
            console.log('get my communities failed:', res.status, res.statusText, body)
            return { admin_communities: [], member_communities: [] }
        }
    } catch (e) {
        console.log('get my communities error:', e)
        return { admin_communities: [], member_communities: [] }
    }
}

export async function createCommunity(
    name: string,
    userId: string,
    opts?: { description?: string; profile?: string }
) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/communities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify({ name, description: opts?.description, profile: opts?.profile }),
        })
        if (res.ok) {
            return await res.json()
        } else {
            const body = await safeReadText(res)
            console.log('create community failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('create community error:', e)
        return null
    }
}

export async function updateCommunity(
    id: string | number,
    data: { name?: string; description?: string; profile?: string },
    userId: string
) {
    const url = `https://tribblebook-backend.onrender.com/communities/${encodeURIComponent(String(id))}`

    // Small helpers scoped to this function
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const shouldRetry = (status?: number) => Boolean(status && [500, 502, 503, 504].includes(status))

    const attempt = async (method: 'PUT' | 'PATCH') => {
        const res = await fetch(url, {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify(data),
        })
        return res
    }

    try {
        // Try up to 3 times for transient 5xx errors
        let method: 'PUT' | 'PATCH' = 'PUT'
        let lastRes: Response | null = null
        for (let i = 0; i < 3; i++) {
            const res = await attempt(method)
            lastRes = res
            if (res.ok) {
                // handle 204 no content gracefully
                try {
                    const json = await res.json()
                    return json ?? {}
                } catch {
                    return {}
                }
            }

            // If method not allowed, try PATCH once immediately
            if (res.status === 405) {
                if (method === 'PUT') {
                    method = 'PATCH'
                    continue
                }
            }

            if (shouldRetry(res.status) && i < 2) {
                await delay(500 * Math.pow(2, i)) // 500ms, 1000ms
                continue
            }
            break
        }

        if (lastRes) {
            const body = await safeReadText(lastRes)
            console.log('update community failed:', lastRes.status, lastRes.statusText, body)
        }
        return null
    } catch (e) {
        console.log('update community error:', e)
        return null
    }
}

export async function deleteCommunity(id: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/communities/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userId}`,
            },
        })
        if (res.ok) {
            const body = await res.json().catch(() => ({}))
            return body?.success !== false
        } else {
            const body = await safeReadText(res)
            console.log('delete community failed:', res.status, res.statusText, body)
            return false
        }
    } catch (e) {
        console.log('delete community error:', e)
        return false
    }
}

export async function deletePost(postId: string | number, userId: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/posts/${postId}` , {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data as { success: boolean; message?: string }
        } else {
            const body = await safeReadText(response)
            console.log("delete post failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("delete post error:", error)
        return null
    }
}

export async function createComment(postId: string, content: string, userId: string, parentId?: number, replyToUsername?: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/posts/${postId}/createComment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
            body: JSON.stringify({ content, parent_id: parentId, reply_to_username: replyToUsername })
        })
        if (response.ok) {
            const data = await response.json()
            return data as CommentProps
        } else {
            console.log("create comment failed:", response.statusText)
            return null
        }
    } catch (error) {
        console.log("create comment error:", error)
        return null
    }
}

export async function createStory(story: StoryViewProps, userId: string) {
    try {
        const response = await fetch("https://tribblebook-backend.onrender.com/stories/create", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
            body: JSON.stringify(story)
        })
        if (response.ok) {
            const data = await response.json()
            return data as { success: boolean; storyId?: number }
        } else {
            const body = await safeReadText(response)
            console.log("create story failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("create story error:", error)
        return null
    }
}

export async function getStories(userId: string) {
    try {
        const response = await fetch("https://tribblebook-backend.onrender.com/stories", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data as Array<{ author: UserProps; stories: StoryViewProps[] }>
        } else {
            const body = await safeReadText(response)
            console.log("get stories failed:", response.status, response.statusText, body)
            return [] as Array<{ author: UserProps; stories: StoryViewProps[] }>
        }
    } catch (error) {
        console.log("get stories error:", error)
        return [] as Array<{ author: UserProps; stories: StoryViewProps[] }>
    }
}

export async function viewStory(storyId: string, userId: string, reaction?: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/stories/${storyId}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
            body: JSON.stringify({ reaction })
        })
        if (response.ok) {
            const data = await response.json()
            return data as { success: boolean; view?: any }
        } else {
            const body = await safeReadText(response)
            console.log("view story failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("view story error:", error)
        return null
    }
}

export async function deleteStory(storyId: string, userId: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/stories/${storyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data as { success: boolean; message?: string }
        } else {
            const body = await safeReadText(response)
            console.log("delete story failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("delete story error:", error)
        return null
    }
}

export async function getStoryViewers(storyId: string, userId: string) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/stories/${storyId}/viewers`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data as StoryViewersResponse
        } else {
            const body = await safeReadText(response)
            console.log("get story viewers failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("get story viewers error:", error)
        return null
    }
}


// get post by id :
export async function getPostById(postId: string | number) {
    try {
        const response = await fetch(`https://tribblebook-backend.onrender.com/posts/${postId}`)
        if (response.ok) {
            const data = await response.json()
            // Some endpoints may return an array; normalize to single PostProps
            const post = Array.isArray(data) ? (data[0] ?? null) : data
            return post as PostProps | null
        } else {
            const body = await safeReadText(response)
            console.log("get post failed:", response.status, response.statusText, body)
            return null
        }
    } catch (error) {
        console.log("get post error:", error)
        return null
    }
}



// recomendations 
export async function getRecommendations(userId: string) {
    try {
        const response = await fetch("https://tribblebook-backend.onrender.com/recommendations", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userId}`
            }
        })
        if (response.ok) {
            const data = await response.json()
            return data as {
                posts: PostProps[];
                communities: Array<{
                    id: string;
                    name: string;
                    profile: string;
                    description: string;
                    member_count: number;
                    recent_members: Array<{ user_id: UserProps }>;
                }>;
                users: UserProps[];
            }
        } else {
            const body = await safeReadText(response)
            console.log("get recommendations failed:", response.status, response.statusText, body)
            return { posts: [], communities: [], users: [] }
        }
    } catch (error) {
        console.log("get recommendations error:", error)
        return { posts: [], communities: [], users: [] }
    }
}

export async function updateMyProfile(
    payload: Partial<Pick<UserProps, 'fullname' | 'bio' | 'profile' | 'private'>>,
    userId: string,
) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/profile/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify(payload),
        })
        if (res.ok) {
            // Endpoint returns updated user
            const data = await res.json()
            return data as UserProps
        } else {
            const body = await safeReadText(res)
            console.log('update profile failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('update profile error:', e)
        return null
    }
}

// ================= Notifications =================
export async function sendNotification(
    userId: string,
    payload: {
        recipientId: string | number
        type: NotificationType
        targetType: NotificationTargetType
        targetId: string | number
        title: string
        body: string
        data?: Record<string, any>
    }
) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/notifications/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify(payload),
        })
        if (res.ok) {
            return await res.json() as {
                success: boolean
                message: string
                notification: NotificationProps
                pushResult?: any
            }
        } else {
            const body = await safeReadText(res)
            console.log('send notification failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('send notification error:', e)
        return null
    }
}

export async function getMyNotifications(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/notifications', {
            headers: {
                'Authorization': `Bearer ${userId}`,
            },
        })
        if (res.ok) {
            return await res.json() as NotificationProps[]
        } else {
            const body = await safeReadText(res)
            console.log('get notifications failed:', res.status, res.statusText, body)
            return [] as NotificationProps[]
        }
    } catch (e) {
        console.log('get notifications error:', e)
        return [] as NotificationProps[]
    }
}

export async function markNotificationRead(id: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/notifications/${encodeURIComponent(String(id))}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userId}`,
            },
        })
        if (res.ok) {
            return await res.json() as {
                success: boolean
                message: string
                notification: NotificationProps
            }
        } else {
            const body = await safeReadText(res)
            console.log('mark notification read failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('mark notification read error:', e)
        return null
    }
}

export async function markAllNotificationsRead(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/notifications/read-all', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userId}`,
            },
        })
        if (res.ok) {
            return await res.json() as { success: boolean; message: string }
        } else {
            const body = await safeReadText(res)
            console.log('mark all notifications read failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('mark all notifications read error:', e)
        return null
    }
}

// =============== Reports & Blocks API ===============
export type ReportTargetType = 'user' | 'post'

export async function createReport(
    targetType: ReportTargetType,
    targetId: string | number,
    userId: string,
    reason?: string,
) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
        })
        if (res.ok) {
            return await res.json() as {
                success: boolean
                message: string
                report: {
                    id: string | number
                    reporter_id: string | number
                    target_type: ReportTargetType
                    target_id: string | number
                    reason?: string | null
                    status: string
                    created_at?: string
                }
            }
        } else {
            const body = await safeReadText(res)
            console.log('create report failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('create report error:', e)
        return null
    }
}

export async function blockUser(targetUserId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/block`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json().catch(() => ({}))
        } else {
            const body = await safeReadText(res)
            console.log('block user failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('block user error:', e)
        return null
    }
}

export async function unblockUser(targetUserId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/block`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json().catch(() => ({}))
        } else {
            const body = await safeReadText(res)
            console.log('unblock user failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('unblock user error:', e)
        return null
    }
}

export interface BlockedUserItem {
    id: string | number
    blockedAt: string
    user: UserProps
}

export async function getBlockedUsers(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/users/blocked', {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json() as BlockedUserItem[]
        } else {
            const body = await safeReadText(res)
            console.log('get blocked users failed:', res.status, res.statusText, body)
            return [] as BlockedUserItem[]
        }
    } catch (e) {
        console.log('get blocked users error:', e)
        return [] as BlockedUserItem[]
    }
}

export async function getBlockStatus(targetUserId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/users/${encodeURIComponent(String(targetUserId))}/block-status`, {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json() as {
                userBlockedTarget: boolean
                targetBlockedUser: boolean
                isBlocked: boolean
            }
        } else {
            const body = await safeReadText(res)
            console.log('get block status failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('get block status error:', e)
        return null
    }
}

// =============== Follow Requests API ===============
export async function sendFollowRequest(targetUserId: string | number, userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/follow-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify({ targetUserId }),
        })
        if (res.ok) {
            return await res.json() as { success: boolean; message: string; request?: FollowRequest; follow?: any }
        } else {
            const body = await safeReadText(res)
            console.log('send follow request failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('send follow request error:', e)
        return null
    }
}

export async function getSentFollowRequests(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/follow-requests/sent', {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) return await res.json() as FollowRequest[]
        const body = await safeReadText(res)
        console.log('get sent follow requests failed:', res.status, res.statusText, body)
        return [] as FollowRequest[]
    } catch (e) {
        console.log('get sent follow requests error:', e)
        return [] as FollowRequest[]
    }
}

export async function getReceivedFollowRequests(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/follow-requests/received', {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) return await res.json() as FollowRequest[]
        const body = await safeReadText(res)
        console.log('get received follow requests failed:', res.status, res.statusText, body)
        return [] as FollowRequest[]
    } catch (e) {
        console.log('get received follow requests error:', e)
        return [] as FollowRequest[]
    }
}

export async function acceptFollowRequest(requestId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/follow-requests/${encodeURIComponent(String(requestId))}/accept`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) return await res.json() as { success: boolean; message: string; follow?: any; request?: FollowRequest }
        const body = await safeReadText(res)
        console.log('accept follow request failed:', res.status, res.statusText, body)
        return null
    } catch (e) {
        console.log('accept follow request error:', e)
        return null
    }
}

export async function rejectFollowRequest(requestId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/follow-requests/${encodeURIComponent(String(requestId))}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) return await res.json() as { success: boolean; message: string; request?: FollowRequest }
        const body = await safeReadText(res)
        console.log('reject follow request failed:', res.status, res.statusText, body)
        return null
    } catch (e) {
        console.log('reject follow request error:', e)
        return null
    }
}

export async function cancelFollowRequest(requestId: string | number, userId: string) {
    try {
        const res = await fetch(`https://tribblebook-backend.onrender.com/follow-requests/${encodeURIComponent(String(requestId))}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) return await res.json() as { success: boolean; message: string }
        const body = await safeReadText(res)
        console.log('cancel follow request failed:', res.status, res.statusText, body)
        return null
    } catch (e) {
        console.log('cancel follow request error:', e)
        return null
    }
}

// =============== Verification Requests API ===============
export async function createVerificationRequest(request_message: string, userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/users/verification-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`,
            },
            body: JSON.stringify({ request_message }),
        })
        if (res.ok) {
            const data = await res.json().catch(() => ({}))
            return data as { success: boolean; message: string; request: VerificationRequest }
        } else {
            const body = await safeReadText(res)
            console.log('create verification request failed:', res.status, res.statusText, body)
            return null
        }
    } catch (e) {
        console.log('create verification request error:', e)
        return null
    }
}

export async function getMyVerificationRequests(userId: string) {
    try {
        const res = await fetch('https://tribblebook-backend.onrender.com/users/verification-requests', {
            headers: { 'Authorization': `Bearer ${userId}` },
        })
        if (res.ok) {
            return await res.json() as VerificationRequest[]
        } else {
            const body = await safeReadText(res)
            console.log('get verification requests failed:', res.status, res.statusText, body)
            return [] as VerificationRequest[]
        }
    } catch (e) {
        console.log('get verification requests error:', e)
        return [] as VerificationRequest[]
    }
}