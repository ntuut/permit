import type {
  SchemaModel,
  AccessBranch,
  Permit,
  PermitBranch,
  PermitNode,
  AccessNode,
  SchemaOptions,
  Simplify,
} from "./types";

/**
 * generate permit from access branch
 */
function generatePermit<T extends SchemaModel>(
  access: AccessBranch<T>,
  granted: string[] = []
): Permit<T> {
  const $value = new Map<string, boolean>();
  let permit: PermitBranch<T>;

  function generateNode(scope: string, description: string): PermitNode {
    return {
      get $scope() {
        return scope;
      },
      get $description() {
        return description;
      },
      get $ok() {
        return $value.get(scope) ?? false;
      },
      get $no() {
        return !$value.get(scope) ?? false;
      },
    };
  }

  function generate<N extends SchemaModel>(
    branch: AccessBranch<N>
  ): PermitBranch<N> {
    const childs: Record<string, PermitNode | PermitBranch<SchemaModel>> = {};
    for (const key in branch) {
      const cursor = branch[key];
      if (
        typeof cursor.$scope === "string" &&
        typeof cursor.$description === "string"
      ) {
        const { $scope, $description } = cursor as AccessNode;
        childs[key] = generateNode($scope, $description);
      } else if (
        !key.startsWith("$") &&
        !(cursor instanceof Array) &&
        !(cursor instanceof Function) &&
        (cursor as AccessBranch<SchemaModel>).$each instanceof Function
      ) {
        childs[key] = generate(
          cursor as AccessBranch<SchemaModel>
        ) as PermitBranch<SchemaModel>;
      }
    }

    return {
      get $scopes() {
        return branch.$scopes;
      },
      get $some() {
        const scopes = branch.$scopes;
        for (let i = 0; i < scopes.length; i++) {
          const node = scopes[i];
          if (!$value.has(node.$scope)) {
            const value = granted.includes(node.$scope);
            $value.set(node.$scope, value);
            if (value) return true;
          }

          const value = $value.get(node.$scope);
          if (value) return true;
        }

        return false;
      },
      get $none() {
        const scopes = branch.$scopes;
        for (let i = 0; i < scopes.length; i++) {
          const node = scopes[i];
          if (!$value.has(node.$scope)) {
            const value = granted.includes(node.$scope);
            $value.set(node.$scope, value);
            if (value) return false;
          }

          const value = $value.get(node.$scope);
          if (value) return false;
        }

        return true;
      },
      get $all() {
        const scopes = branch.$scopes;
        for (let i = 0; i < scopes.length; i++) {
          const node = scopes[i];
          if (!$value.has(node.$scope)) {
            const value = granted.includes(node.$scope);
            $value.set(node.$scope, value);
            if (!value) return false;
          }

          const value = $value.get(node.$scope);
          if (!value) return false;
        }

        if ($value.size === 0) return false;
        return true;
      },

      toJSON() {
        const { $scopes, ...rest } = this;
        return rest;
      },

      ...childs,
    } as PermitBranch<N>;
  }

  function mapAccessNode(value: boolean) {
    const scopes: string[] = [];
    for (const [key, val] of $value.entries()) {
      if (val === value) scopes.push(key);
    }

    return access.$scopes.filter((node) => scopes.includes(node.$scope));
  }

  function setScopeValue(value: boolean, ...scopes: string[]) {
    for (const scope of scopes) {
      if ($value.has(scope)) {
        $value.set(scope, value);
      }
    }

    // generate new permit every update
    permit = generate(access);
  }

  function reset() {
    $value.clear();
    access.$each((node) =>
      $value.set(node.$scope, granted.includes(node.$scope))
    );

    // generate new permit every reset
    permit = generate(access);
  }

  reset();

  return {
    get granted() {
      return mapAccessNode(true);
    },
    get denied() {
      return mapAccessNode(false);
    },
    get scopes() {
      return access.$scopes;
    },
    get is() {
      return permit;
    },
    reset() {
      reset();
      permit = generate(access);
    },
    grant(...scopes: string[]) {
      setScopeValue(true, ...scopes);
    },
    deny(...scopes: string[]) {
      setScopeValue(false, ...scopes);
    },
    check(scope: string) {
      return $value.get(scope) ?? false;
    },
  };
}

/**
 * Create access control tree from schema tree.
 *
 * ```js
 * // example schema for todo list application:
 * const schema = {
 *     todo: {
 *         view: "Access todo view page",
 *         action: {
 *             create: "Create new todo",
 *             update: "Update todo",
 *             delete: "Delete todo",
 *         }
 *     },
 *     users: {
 *         view: "Access user management view page",
 *         action: {
 *             create: "Create new user",
 *             update: "Update user",
 *             delete: "Delete user",
 *         }
 *     },
 * }
 *
 * const access = createSchema(schema, { prefix: 'app' });
 * console.log(access.todo.action.create.$scope);
 * // this will output a string scope 'app.todo.action.create'
 * // the string scope can be used as a key for user to access the feature of create todo.
 *
 * // for checking permission you need to create a permit for user
 * // in this example we create a permit for user that can only create todo
 * const permit = access.$permit(['app.todo.action.create'])
 *
 * //then in some part of your code you can use permit to check permission:
 * // this method will give you autocomplete using typescript type
 * permit.is.todo.action.create.$ok
 * // or
 * permit.check('app.todo.action.create')
 * ```
 */
export function createSchema<T extends SchemaModel>(
  schema: T,
  options: Simplify<Partial<SchemaOptions>> = {}
): AccessBranch<T> {
  const spacer = options.spacer ?? ".";
  const prefix = options.prefix ?? "";

  function generateScope(...paths: string[]) {
    return paths.filter((p) => p && p.trim() !== "").join(spacer);
  }

  function generateAccess<N extends SchemaModel>(
    id: string,
    node: N,
    path = ""
  ): AccessBranch<N> {
    const $scope = generateScope(path, id);

    // generated childs for current branch node
    const childs: Record<string, AccessBranch<SchemaModel> | AccessNode> = {};
    for (const key in node) {
      const cursor: SchemaModel | string | AccessNode = node[key];
      if (typeof cursor === "string") {
        childs[key] = {
          $scope: generateScope($scope, key),
          $description: cursor,
        } as AccessNode;
      } else if (typeof cursor.$scope === "string") {
        childs[key] = {
          $scope: cursor.$scope,
          $description:
            typeof cursor.$description === "string" ? cursor.$description : "",
        } as AccessNode;
      } else if (!(cursor instanceof Array) && !(cursor instanceof Function)) {
        childs[key] = generateAccess(
          key,
          cursor as SchemaModel,
          $scope
        ) as AccessBranch<SchemaModel>;
      } else {
        childs[key] = cursor as any;
      }
    }

    function each(fn: (node: AccessNode) => void) {
      for (const key in childs) {
        const cursor = childs[key];
        if (
          typeof cursor.$scope === "string" &&
          typeof cursor.$description === "string"
        ) {
          fn(cursor as AccessNode);
        } else if (
          (cursor as AccessBranch<SchemaModel>).$each instanceof Function
        ) {
          (cursor as AccessBranch<SchemaModel>).$each(fn);
        }
      }
    }

    const context = {
      get $scopes() {
        const scopes: AccessNode[] = [];
        each((node) => scopes.push(node));

        return scopes;
      },
      get $model() {
        // create duplicate schema model object
        const model = JSON.stringify(node);
        return JSON.parse(model) as N;
      },

      $each(fn: (node: AccessNode) => void) {
        each(fn);
      },

      $permit(granted: string[]) {
        return generatePermit(this, granted);
      },

      toJSON() {
        return node;
      },

      ...childs,
    } as AccessBranch<N>;

    return context;
  }

  return generateAccess(prefix, schema);
}

/**
 * Directly create a permit from schema model.
 */
export function createPermit<T extends SchemaModel>(
  schema: T,
  options: Simplify<Partial<SchemaOptions & { granted: string[] }>> = {}
): Permit<T> {
  return createSchema(schema, options).$permit(options.granted ?? []);
}
