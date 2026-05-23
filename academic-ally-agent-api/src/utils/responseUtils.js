export const successResponse = ({ module, message, data = {}, state = {} }) => ({
  ok: true,
  module,
  message,
  data,
  state
});

export const errorResponse = ({ module, message, error = {} }) => ({
  ok: false,
  module,
  message,
  error:
    error instanceof Error
      ? {
          name: error.name,
          message: error.message
        }
      : error
});

export const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};
