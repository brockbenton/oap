**ALWAYS RESPOND IN ENGLISH**

## 📋 Core Working Principles

1. For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously and in parallel.
2. Before you finish, please verify your solution
3. Do what has been asked; nothing more, nothing less.
4. NEVER create files unless they're absolutely necessary for achieving your goal.
5. ALWAYS prefer editing an existing file to creating a new one.
6. NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
7. ADDITIONAL INFO ON PROJECT CAN BE FOUND IN [./docs or other folder]
8. PROJECT STRUCTURE IS IN ./PROJECT_STRUCTURE.md

## 🏛️ Architectural Principles

**"As simple as possible, but not simpler"**

- **KISS + DRY + YAGNI + Occam's Razor**: each new entity must justify its existence
- **Prior-art first**: look for existing solutions first, then write our own
- **Documentation = part of code**: architectural decisions are recorded in code and comments
- **No premature optimization**
- **100% certainty**: evaluate cascading effects before changes

## 🚨 Code Quality Standards

**All code checks are mandatory - code must be ✅ CLEAN!**
No errors. No formatting issues. No compiler warnings.

**Architectural standards:**

- Minimally sufficient patterns (don't overcomplicate)
- Decomposition: break tasks into subtasks
- Cascading effects: evaluate impact of changes

## ✅ Verification Checkpoints

**Stop and check** at these moments:

- After implementing a complete function
- Before starting a new component/module
- Before declaring "done"

Run check: `[check commands: lint, test, build]`

> Why: This prevents error accumulation and ensures code stability.

## 💻 Coding Standards

### FORBIDDEN:

- **NO any type** - use strict typing!
- **NO console.log** in production code - use proper logging!
- **NO hardcoded values** - use constants and configs!
- **NO code duplication** - reuse components and utilities!
- **NO ignoring errors** - handle all exceptions!
- **NO TODOs** in final code

### Mandatory rules:

- Always use specific types (if language supports)
- Use constants and configuration
- Reuse existing components and utilities
- Always handle exceptions
- **Meaningful names** for variables and functions
- **Early returns** to reduce nesting
- **Error handling** explicit and clear

## 📊 Implementation Standards

### Code is considered ready when:

- ✓ Build passes without errors
- ✓ All tests pass
- ✓ Formatting applied
- ✓ Compiler produces no errors/warnings
- ✓ Function works end-to-end
- ✓ Old/unused code removed
- ✓ Code is understandable to junior developer

### Testing Strategy

- Unit tests for functions and modules
- Integration tests for API/services
- E2E tests for critical functionality (if applicable)
- Critical functionality → write tests first

### **Security always**:

- Validate all external data
- Don't store sensitive data openly
- Use HTTPS/TLS for communication
- Escape user input

## 🤝 Problem Solving

When stuck or confused:

1. **Stop** - Don't overcomplicate the solution
2. **Step back** - Re-read requirements and specifications
3. **Simplify** - Simple solution is usually better
4. **Ask** - "I see two approaches: [A] vs [B]. Which aligns better with project standards?"

Your ideas for improvement are welcome - ask!

# Important Instructions Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.