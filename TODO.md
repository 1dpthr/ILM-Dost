# TODO - Course-scoped uploads

- [x] Update `src/types/test.ts` to include `courseId`.

- [x] Update `TeacherTests.tsx`:
  - [x] Load teacher’s courses.
  - [x] Add course selector to “Create Test”.
  - [x] Save `courseId` in created test.

- [x] Update `StudentTests.tsx`:
  - [x] Load student’s enrolled courses from `/enrollments/:studentId`.
  - [x] Filter available tests by `courseId`.
  - [x] Ensure handwritten upload submission only appears for tests within enrolled courses.



- [x] Update `TeacherMaterials.tsx`:
  - [x] Load teacher’s courses.
  - [x] Add course selector to “Upload Material”.
  - [x] Save `courseId` in material.
- [x] Update `StudentMaterials.tsx`:
  - [x] Load student’s enrolled courses.
  - [x] Filter visible materials by `courseId`.
  - [x] Keep submission UI only for filtered materials.

- [ ] Run build/lint/test (pnpm) and fix any TS errors.

