import * as React from 'react';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

interface RouterContext {
  isAuthenticated: boolean;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  beforeLoad: ({ context }) => {
    // Validate the context
    if (typeof context.isAuthenticated !== 'boolean') {
      throw new Error('isAuthenticated must be a boolean');
    }
  },
});

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
    </React.Fragment>
  );
}
