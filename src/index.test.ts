import { expect, test } from "vitest";
import { createPermit, createSchema } from "./index";

const schema = {
  todo: {
    view: {
      $scope: "@view",
    },
    action: {
      create: "Create new todo",
      update: "Update todo",
      delete: "Delete todo",
    },
  },
  users: {
    manage: {
      view: "Access user management view page",
      action: {
        create: "Create new user",
        update: "Update user",
        delete: "Delete user",
      },
    },
    profile: {
      view: "Access user profile view page",
    },
  },
};

test("createSchema", () => {
  const access = createSchema(schema);
  expect(access.todo.view.$scope).toBe("@view");
  expect(access.todo.action.create.$scope).toBe("todo.action.create");

  const todoAccess = createSchema(schema.todo);
  expect(todoAccess.view.$scope).toBe("@view");
  expect(todoAccess.action.create.$scope).toBe("action.create");

  const custom = createSchema(schema, { prefix: "@", spacer: "-" });
  expect(custom.todo.view.$scope).toBe("@view");
  expect(custom.todo.action.create.$scope).toBe("@-todo-action-create");
});

test("createPermit", () => {
  const permit = createPermit(schema, {
    granted: ["todo.action.create", "@view"],
  });
  expect(permit.is.todo.view.$ok).toBe(true);
  expect(permit.is.todo.$some).toBe(true);
  expect(permit.is.todo.action.$some).toBe(true);
  expect(permit.is.todo.action.create.$no).toBe(false);
  expect(permit.is.users.profile.view.$ok).toBe(false);
  expect(permit.is.users.$none).toBe(true);
  expect(permit.is.users.$all).toBe(false);

  expect(permit.check("@view")).toBe(true);
});
