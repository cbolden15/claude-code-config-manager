# Auto-Claude API Integration Tests

This directory contains comprehensive integration tests for all Auto-Claude API endpoints with real database operations.

## Test Structure

### Main Test Files

1. **`index.test.ts`** - Main API integration tests covering all endpoints
2. **`import.test.ts`** - Specialized tests for the Auto-Claude import endpoint
3. **`validation.test.ts`** - Validation and error handling tests
4. **`test-utils.ts`** - Shared test utilities and mock data
5. **`run-all-tests.ts`** - Test runner that executes all test suites

## Test Coverage

### API Endpoints Tested

- **Agents CRUD**:
  - `GET/POST /api/auto-claude/agents`
  - `GET/PUT/DELETE /api/auto-claude/agents/[agentType]`

- **Prompts CRUD**:
  - `GET/POST /api/auto-claude/prompts`
  - `GET/PUT/DELETE /api/auto-claude/prompts/[id]`

- **Model Profiles CRUD**:
  - `GET/POST /api/auto-claude/model-profiles`
  - `GET/PUT/DELETE /api/auto-claude/model-profiles/[id]`

- **Import/Sync Endpoints**:
  - `POST /api/auto-claude/import`
  - `POST /api/auto-claude/sync`

- **Generate Integration**:
  - `POST /api/generate` with `autoClaudeEnabled` flag

### Database Operations Tested

✅ **Component CRUD Operations**
- Create, read, update, delete operations
- Real Prisma database transactions
- Data validation and constraint checking
- Duplicate detection and handling

✅ **Data Validation**
- Required field validation
- Type and format validation
- Enum value validation (ClaudeModel, ThinkingLevel)
- Database constraint validation

✅ **Error Handling**
- HTTP status code validation
- Error response format checking
- Graceful handling of invalid inputs
- Database transaction rollback testing

✅ **Edge Cases**
- Empty data scenarios
- Malformed request bodies
- Missing required fields
- Invalid enum values
- Duplicate resource creation

## Running Tests

### Run All Tests
```bash
# Make executable and run all test suites
chmod +x packages/server/__tests__/api/auto-claude/run-all-tests.ts
node packages/server/__tests__/api/auto-claude/run-all-tests.ts
```

### Run Individual Test Suites
```bash
# Main API integration tests
node packages/server/__tests__/api/auto-claude/index.test.ts

# Import endpoint tests
node packages/server/__tests__/api/auto-claude/import.test.ts

# Validation tests
node packages/server/__tests__/api/auto-claude/validation.test.ts
```

## Test Data Management

### Cleanup Strategy
- Tests automatically clean up test data before and after execution
- Uses naming patterns (`test-*`) to identify test data
- Ensures no interference between test runs

### Mock Data
- Realistic Auto-Claude configuration examples
- Valid TypeScript types and Zod schemas
- Comprehensive test scenarios for all component types

## Test Results

The test runner provides:
- ⏱️ Duration tracking for each test suite
- 📊 Success/failure statistics
- 📋 Detailed error reporting
- 🎯 Test coverage summary
- 🔍 Database operation validation

## Integration with CCM

These tests validate the complete Auto-Claude integration:
- Database schema compatibility
- API endpoint functionality
- Data validation rules
- Error handling patterns
- Generate endpoint Auto-Claude features

## Notes

- Tests use direct API route handler imports for fast execution
- Mock Next.js Request objects for realistic testing
- Real database operations with proper cleanup
- Comprehensive coverage of Auto-Claude functionality

## Future Enhancements

- Performance benchmarking
- Load testing capabilities
- Integration with CI/CD pipeline
- Automated regression testing
- Database migration testing