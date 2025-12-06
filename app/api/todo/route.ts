import { Todo } from '@/app/generated/prisma/client';
import prisma from '@/lib/prisma'
import type { NextRequest } from 'next/server'
 
interface todoList {
    id: string;
    title: string;
    status: number;
    createdAt: Date;
    cost: number;
    name: string;
    updateAt: Date | null;
    record: {
        id: string;
        status: number;
    };
}

export async function GET(_req: NextRequest) {
    const todoItem: todoList[] = [];
  const todos = await prisma.todo.findMany({
    select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updateAt: true,
        cost: true,
        name: true,
    },
    orderBy: [
        {updateAt: 'desc'},
        {createdAt: 'asc'}
    ],
  })

  for (const [i, todo] of todos.entries()) {
    todoItem.push({id: todo.id, title: todo.title, status: todo.status, createdAt: todo.createdAt, cost: todo.cost, name: todo.name, updateAt: todo.updateAt, record: {id: '', status: 0}})
    if(todo.status === 0) {
    const record = await prisma.record.findFirst({
        where: { 
            todoid: todo.id,
            ended: null
         },
        select: {
            id: true,
            status: true,
            createdAt: true,
        }
    });
    if(record) { 
        todoItem[i].record = {id: record.id, status: record.status}
        todoItem[i].cost += Math.floor((new Date().getTime() - record.createdAt.getTime()) / 60000);
    }
    }
}
return Response.json(todoItem)
}

export async function POST(request: NextRequest,{ params, }:  { params: Promise<{}> }) {
    const receiveData = await request.json()
    let createdTodo:Todo
        try {
            createdTodo = await prisma.todo.create({
            data: {
             userid: receiveData.userId,
             title: receiveData.title,
             status: receiveData.status,
             cost:0,
                name: receiveData.name,
              }
            })
        } catch (error) {
            console.error("Error creating come:", error);
            return Response.json({ message: "Error creating come" }, { status: 500 })
        }

    return Response.json({messge: 'success' , id: createdTodo.id }, { status: 200 })
}