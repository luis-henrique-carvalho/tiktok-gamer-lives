---
name: solid
description: Professional Software Engineering and SOLID Principles for modern TypeScript & Polyglot codebases. Enforces clean architecture, high cohesion, low coupling, interface segregation, dependency inversion, and pragmatic refactoring balanced with YAGNI (ponytail).
---

# Solid Skills: Professional Software Engineering (TypeScript & Polyglot)

You operate as a senior software craftsman. Every module, function, and interface you design must embody high cohesion, low coupling, testability, and maintainability, balanced ruthlessly with simplicity (YAGNI / KISS).

## When This Skill Applies

**Use this skill when:**
- Writing any domain logic, services, workers, or API endpoints.
- Designing contracts, SPIs (Service Provider Interfaces), or ports & adapters.
- Refactoring complex code, eliminating technical debt, and tackling code smells.
- Planning software architecture and boundaries (Hexagonal / Clean Architecture).
- Reviewing code for maintainability, coupling, and adherence to design principles.
- Establishing test-driven designs (TDD) and boundary mocks.

## Core Philosophy

> "Code is written to create value for users. Testable, flexible, and maintainable code is essential because software must be discoverable, understandable, testable, and evolvable at low cost."

Good software balances **formal engineering principles** (SOLID, Clean Architecture) with **extreme pragmatism** (YAGNI, Ponytail simplicity, native idioms).

---

## The Non-Negotiable Process

### 1. Test-Driven Development (TDD) First

**Red → Green → Refactor is mandatory for domain logic:**

```
1. RED      - Write a focused test expressing the intended behavior and contract.
2. GREEN    - Write the SIMPLEST code that makes the test pass.
3. REFACTOR - Eliminate duplication (Rule of Three), improve names, enforce SOLID.
```

**The Three Laws of TDD:**
1. Do not write production code without a failing test.
2. Do not write more test code than needed to fail.
3. Do not write more production code than needed to pass.

*Architectural insight: Design and clean boundaries emerge during the REFACTOR phase, not before.*

*(See [references/tdd.md](references/tdd.md) and [references/testing.md](references/testing.md))*

---

### 2. SOLID Principles in Practice

Every module, class, interface, and function must be evaluated against SOLID:

| Principle | Core Question | Modern TypeScript Application |
|---|---|---|
| **S**RP - Single Responsibility | "Does this module/function have ONE reason to change?" | Separate domain business rules from database queries, HTTP routers, and serialization. |
| **O**CP - Open/Closed | "Can we extend behavior without modifying tested core logic?" | Use Strategy pattern, plugin registries, or polymorphic SPIs instead of massive `switch/case` cascades. |
| **L**SP - Liskov Substitution | "Can subtypes or implementations replace base types without surprises?" | Implementations must fulfill contracts completely; never throw `NotImplementedError` or violate invariants. |
| **I**SP - Interface Segregation | "Are consumers forced to depend on methods they do not use?" | Favor small, role-specific interfaces (`GameEngine`, `GameInputMapper`) over fat, bloated interfaces. |
| **D**IP - Dependency Inversion | "Do high-level modules depend on abstractions rather than concrete details?" | Host/Core depends on abstract Ports/SPIs. Adapters (Postgres, Redis, BullMQ, Socket.IO) implement the abstractions. |

*(See [references/solid-principles.md](references/solid-principles.md))*

#### Concrete Example: Hexagonal SPI & DIP

```typescript
// BAD: High-level GameCoordinator depends directly on concrete Redis and Postgres
import { redisClient } from '../infra/redis';
class GameCoordinator {
  async processInput(id: string) {
    await redisClient.hget('games', id); // Tightly coupled to Redis!
  }
}

// GOOD: Dependency Inversion via SPI Contract
export interface GameStateStore {
  getSnapshot(gameId: string): Promise<GameSnapshot | null>;
  saveSnapshot(gameId: string, snapshot: GameSnapshot): Promise<void>;
}

export class GameCoordinator {
  constructor(private readonly store: GameStateStore) {}

  async processInput(gameId: string) {
    const snapshot = await this.store.getSnapshot(gameId);
    // Domain logic independent of persistence technology
  }
}
```

---

### 3. Clean Code & Idiomatic TypeScript

Adopt clean code principles tailored for modern TypeScript without dogmatic OOP baggage:

#### Naming & Expressiveness
1. **Consistency**: Same domain concept = same name across API, DB, and tests.
2. **Ubiquitous Language**: Use domain terminology (`GiftEvent`, `ComboBuffer`, `RoomSession`) over generic labels (`Data`, `Info`, `Manager`, `Processor`).
3. **Brevity with Clarity**: Greppable, explicit names.

#### Functions & Control Flow
- **Small & Focused**: Functions should do one thing at one level of abstraction.
- **Fail Fast / Guard Clauses**: Use early returns. Eliminate nested `if / else` ladders.
- **Positive Conditionals**: Favor `isValid(x)` over `!isInvalid(x)`.
- **Parameter Count**: Prefer 1-2 parameters; for 3+, use an explicit options/command object.

#### Modern Value Objects & Type Safety
*Avoid Java-style OOP boilerplate (like creating a 10-line class for every single string). Instead, use modern TypeScript idioms:*
- **Zod Schemas**: Parse and validate inputs at system boundaries (HTTP, WebSockets, BullMQ jobs).
- **Branded Types / Pure Factory Functions**: Ensure type safety for domain primitives when needed:
  ```typescript
  export type UserId = string & { readonly __brand: unique symbol };
  export type GiftId = string & { readonly __brand: unique symbol };
  ```
- **Native Readonly Collections**: Use idiomatic `readonly T[]` and pure array methods (`.map`, `.filter`, `.reduce`) rather than wrapping every list in a custom collection class.
- **Object.hasOwn**: Validate untrusted keys using `Object.hasOwn(obj, key)` rather than `key in obj`.

*(See [references/clean-code.md](references/clean-code.md))*

---

### 4. Pragmatism vs. Over-Engineering (Balancing with Ponytail)

> **Rule of Pragmatism**: Never introduce an abstraction until you actually have multiple implementations or proven volatility (Rule of Three). Speculative generality is technical debt.

- **Essential Complexity**: The core problem you must solve (e.g. TikTok gift combos, serial execution FIFO).
- **Accidental Complexity**: Extra layers, factories, abstract factories, and wrappers you introduced because "we might need it someday".
- **Delete / Inline**: If an interface only has and will only ever have 1 trivial implementation, don't invent 5 layers of indirection unless architectural boundaries (e.g., Hexagonal ports) require it.

*(See [references/complexity.md](references/complexity.md))*

---

### 5. Architecture & Boundary Design

Follow the **Dependency Rule** and **Vertical Slicing**:

1. **Vertical Slicing**: Group features by domain slices (`modules/games/`, `modules/donations/`, `modules/session/`) rather than technical layers (`controllers/`, `services/`, `models/`).
2. **Ports & Adapters (Hexagonal)**:
   - **Core/Domain**: Pure business rules, zero framework dependencies.
   - **Ports**: Inbound (API/WebSocket routes) and Outbound (Database, Queues, Cache).
   - **Adapters**: Concrete implementations (Fastify, Drizzle, Redis, BullMQ).
3. **Zero Leaks**:
   - Never leak ORM entities, raw database rows, or framework request objects into domain logic.
   - Never share backend domain models directly with frontend consumers; keep network payloads explicitly typed per boundary.

*(See [references/architecture.md](references/architecture.md) and [references/object-design.md](references/object-design.md))*

---

### 6. Code Smell Detection & Refactoring Taxonomy

Stop and refactor immediately when encountering these smells:

| Category | Smell | Symptom | Refactoring Strategy |
|---|---|---|---|
| **Bloaters** | Long Function | > 50-80 lines or multiple abstraction levels | Extract Function / Compose Function |
| | Large Class/Module | Hundreds of lines doing multiple unrelated tasks | Extract Class / Split Domain Module |
| | Primitive Obsession | Raw unvalidated strings/numbers for domain concepts | Zod Schema / Branded Type / Value Object |
| | Data Clumps | Same 3-4 fields passed together repeatedly | Group into a Command or Context object |
| **Couplers** | Feature Envy | Method constantly querying another object's internal data | Move method closer to the data (Tell, Don't Ask) |
| | Inappropriate Intimacy | Direct access to private/internal state of another module | Introduce explicit interface or seam |
| | Message Chains | `a.getB().getC().execute()` | Law of Demeter; hide delegation |
| **Dispensables**| Speculative Generality | Interfaces/abstractions with only 1 trivial use case | Inline / Simplify (YAGNI / Ponytail) |
| | Dead / Zombie Code | Uncalled functions, commented code, unused imports | Delete ruthlessly |
| | Duplicated Logic | Identical logic copy-pasted in multiple places | Extract helper after the 3rd occurrence (Rule of Three) |
| **Conditionals**| Massive Switch/If | Branching on type strings across many files | Polymorphic Strategy / Command Map |

*(See [references/code-smells.md](references/code-smells.md) and [references/design-patterns.md](references/design-patterns.md))*

---

## Checklists for Every Implementation

### Pre-Implementation Checklist
- [ ] Understand the acceptance criteria and non-functional requirements.
- [ ] Is there an existing architectural boundary (Hexagonal Port/SPI) to respect?
- [ ] What is the failing test that will drive the implementation?
- [ ] What is the simplest solution that could possibly work?

### During Implementation Checklist
- [ ] Are functions doing one thing and returning early on guards?
- [ ] Is domain logic isolated from HTTP/DB/framework concerns?
- [ ] Are interfaces narrow and client-driven (ISP)?
- [ ] Are dependencies injected rather than hard-coded (DIP)?

### Post-Implementation & Review Checklist
- [ ] Do all automated tests pass with required coverage thresholds?
- [ ] Are there any code smells (Bloaters, Couplers, Primitive Obsession)?
- [ ] Did we avoid speculative generality and keep the solution minimal?
- [ ] Are types strict (zero `any`) and validated with Zod at the boundaries?
