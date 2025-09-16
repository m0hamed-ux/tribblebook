import { CommentProps, PostProps, UserProps } from "@/lib/database.module";

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