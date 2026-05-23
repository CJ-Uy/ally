import express from "express";

import { DEFAULT_STUDENT_ID } from "../config.js";
import {
  getStudentState,
  resetAllStudentStates,
  resetStudentState
} from "../state/demoState.js";
import { asyncHandler, successResponse } from "../utils/responseUtils.js";

export const stateRouter = express.Router();

stateRouter.get(
  "/state",
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId || DEFAULT_STUDENT_ID;
    const state = getStudentState(studentId);

    res.json(
      successResponse({
        module: "Academic Ally State",
        message: "Current demo state returned.",
        data: {
          state
        },
        state
      })
    );
  })
);

stateRouter.post(
  "/state/reset",
  asyncHandler(async (req, res) => {
    const studentId = req.body?.studentId || DEFAULT_STUDENT_ID;
    const state = studentId === "all" ? resetAllStudentStates() : resetStudentState(studentId);

    res.json(
      successResponse({
        module: "Academic Ally State",
        message: "Demo state reset.",
        data: {
          studentId: state.studentId
        },
        state
      })
    );
  })
);
