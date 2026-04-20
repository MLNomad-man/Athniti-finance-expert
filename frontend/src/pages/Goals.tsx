import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GoalForm from '../components/GoalForm';

export default function Goals() {
  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 pt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Financial Goals</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Set your financial milestones and track progress towards them.
          </p>
        </div>
        <GoalForm />
      </div>
    </DashboardLayout>
  );
}
