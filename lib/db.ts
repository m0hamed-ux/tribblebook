import { CommentProps, CommunityProps, PostProps, UserProps } from "@/lib/database.module";
import { UserPlusIcon } from "phosphor-react-native";

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
        return await comments.json() as Array<CommentProps>
    } catch (error) {
        console.log(error)
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

export async function createPost(title: string, content: string, userId: string, images?: string[], video?: string, links?: string){
    try{
        const response = await fetch("https://tribblebook-backend.onrender.com/create/post", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userId}`
            },
            body: JSON.stringify({ title, content, images, video, links })
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