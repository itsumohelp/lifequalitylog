import { JsonObject } from "../generated/prisma/internal/prismaNamespace"

type AppLog = {
    id : string,
    createdAt : string, 
    logLevel : string,
    message : string,
    context : JsonObject
}

export default async function Page() {
  const data = await fetch('http://localhost:3000/api/logs')
  const posts = await data.json()
 
  return (
    <table border={10} cellPadding={5} cellSpacing={0}>
      <thead>
        <tr>
            <th>ID</th>
            <th>Created At</th>
            <th>Log Level</th>
            <th>Message</th>
        </tr>
      </thead>
      <tbody>
     {posts.logs.map((post:AppLog) => (
        <tr key={post.id}>
            <td>{post.id}</td>
            <td>{post.createdAt}</td>
            <td>{post.logLevel}</td>
            <td>{post.message}</td>
        </tr>
      ))}
        </tbody>
    </table>
  )
}