Review the staged git diff and check for:
- [ ] Style: naming conventions match the project (see CLAUDE.md)
- [ ] Error handling: all async functions have try/catch or equivalent
- [ ] Tests: new code has corresponding tests
- [ ] Security: no hardcoded secrets, no raw SQL
Output a numbered list of findings. Be specific about file and line number.