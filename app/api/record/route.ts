import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server';

interface todoList {
    id: string;
    title: string;
    status: number;
    createdAt: Date;
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
        createdAt: true,}
  })

  for (const [i, todo] of todos.entries()) {
    todoItem.push({id: todo.id, title: todo.title, status: todo.status, createdAt: todo.createdAt, record: {id: '', status: 0}})
    if(todo.status === 0) {
    const records = await prisma.record.findMany({
        where: { 
            todoid: todo.id,
            ended: null
         },
        select: {
            id: true,
            status: true
        }
    });
    todoItem[i].record = {id: records[0].id, status: records[0].status}
    }
}
return Response.json(todoItem)
}

export async function POST(request: NextRequest,{ params, }:  { params: Promise<{}> }) {
    const receiveData = await request.json()
        try {
            const exitingRecord = await prisma.record.findFirst({
                where: {
                    todoid: receiveData.todoId,
                    ended: null
                }
            });
            if (exitingRecord) {
                return Response.json({messge: 'already exists' ,  status: 400 }, { status: 400 })
            }
                await prisma.record.create({
                data: {
                todoid: receiveData.todoId,
                status: 1,
                updateAt: new Date().toISOString()
                }
                })
                return Response.json({messge: 'success' ,  status: 200 })
        } catch (error) {
            console.error("Error creating come:", error);
            return Response.json({ message: "Error creating come" }, { status: 500 })
        }
}

export async function PUT(request: NextRequest,{ params, }:  {params: Promise<{}>}) {
    const receiveData = await request.json()
        try {
            const exitingRecord = await prisma.record.findFirst({
                where: {
                    todoid: receiveData.todoId,
                    ended: null,
                }
            });
            if (!exitingRecord) {
                return Response.json({messge: 'target record do not exist' ,  status: 404 }, { status: 404 })
            }
                await prisma.record.update({
                    where: {
                        id: exitingRecord.id,
                    },
                        data: {
                            status: receiveData.status,
                            updateAt: new Date().toISOString(),
                            ended: new Date().toISOString(),
                        }
                    })
                const recordList = await prisma.record.findMany({
                    where: {
                        todoid: receiveData.todoId,
                    }
                });
                let totalMinutes = 0;
                for (const record of recordList) {
                    const workMuinutes = record.ended && record.createdAt ? Math.floor((record.ended.getTime() - record.createdAt.getTime()) / 60000) : 0;
                    totalMinutes += workMuinutes
                }
                await prisma.todo.update({
                    where: {
                        id: receiveData.todoId,
                    },
                    data: {
                        cost: totalMinutes,
                        updateAt: new Date().toISOString(),
                    }
                })
                return Response.json({messge: 'success' , cost: totalMinutes}, { status: 200 })
        } catch (error) {
            console.error("Error creating come:", error);
            return Response.json({ message: "Error creating come" }, { status: 500 })
        }
}