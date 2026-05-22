/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClearanceStatus = 'Cleared' | 'Hold' | 'Denied';
export type BoardingStatus = 'Boarder' | 'Day Scholar';

export interface Student {
  id: string; // Internal database ID (UUID or similar hash)
  adminNo: string; // School admission/ID number (e.g., ADM-2026-004)
  name: string;
  gender: 'Male' | 'Female';
  gradeClass: string; // Class / Form (e.g., Form 4 West, Grade 10B)
  boardingStatus: BoardingStatus;
  isCleared: boolean; // General clearance state (true: Cleared, false: Hold / Not Cleared)
  gateStatus?: ClearanceStatus; // Deprecated but kept optional for backward compatibility
  mealsStatus?: ClearanceStatus; // Deprecated but kept optional for backward compatibility
  gateClearanceDate?: string;
  mealsClearanceDate?: string;
  remarks?: string;
  photo?: string; // Base64 passport photo
}

export type CardSide = 'front' | 'back' | 'payment' | 'both';

export interface PageLayout {
  cardsPerPage: 1 | 2 | 4 | 6 | 8;
  showFront: boolean;
  showBack: boolean;
  doubleSidedMode: 'side-by-side' | 'independent-pages';
}
