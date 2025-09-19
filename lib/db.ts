import { CommentProps, CommunityProps, PostProps, StoryViewProps, StoryViewersResponse, UserProps } from "@/lib/database.module";

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

export async function createPost(title: string, content: string, userId: string, images?: string[], video?: string, links?: string, community?: string | number){
    try{
        const response = await fetch("https://tribblebook-backend.onrender.com/create/post", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
                body: JSON.stringify({ title, content, images, video, links, community, communityId: community })
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