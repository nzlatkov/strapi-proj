'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {
        let tasks;

        if (ctx.query._q) {
            tasks = await strapi.services.task.search(ctx.query);
        } else {
            tasks = await strapi.services.task.find(ctx.query);
        }

        const user = await strapi.query('user', 'users-permissions').findOne({ id: ctx.state.user.id });

        const completedIds = [];
        user.tasks_completed.forEach(task => {
            completedIds.push(task.id);
        });

        tasks.forEach(task => {
            if (completedIds.includes(task.id)) {
                task.completed = true;
            } else {
                task.completed = false;
            }
        });

        return tasks.map(task => sanitizeEntity(task, { model: strapi.models.task }));
    },

    
    async findOne(ctx) {
        const { id } = ctx.params;
    
        const task = await strapi.services.task.findOne({ id });
        const user = await strapi.query('user', 'users-permissions').findOne({ id: ctx.state.user.id });

        if (user.tasks_completed.some(task => task.id == id)) task.completed = true;
        else task.completed = false;

        return sanitizeEntity(task, { model: strapi.models.task });
    },

    async complete(ctx) {
        const { id } = ctx.params;
        const user = await strapi.query('user', 'users-permissions').findOne({ id: ctx.state.user.id });

        for (let i = 0; i < user.tasks_completed.length; i++) {
            if (user.tasks_completed[i].id == id) {
                return {
                    'statusCode': 422,
                    'error': 'Unprocessable Entity',
                    'message': 'Task already completed by current user.'
                }
            }
        }

        const newTask = await strapi.services.task.findOne({ id });
        await strapi.query('user', 'users-permissions').update({id: ctx.state.user.id}, {tasks_completed: [...user.tasks_completed, newTask], xp: user.xp + newTask.xp});

        return sanitizeEntity(newTask, { model: strapi.models.task });
    }
};
