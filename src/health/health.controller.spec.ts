import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

// describe is used to group related tests.
describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    // Create a test module with the HealthController
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    // Get the HealthController instance from the test module
    // and assign it to the controller variable
    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return { status: "ok" }', () => {
      expect(controller.check()).toEqual({ status: 'ok' });
    });
  });
});
