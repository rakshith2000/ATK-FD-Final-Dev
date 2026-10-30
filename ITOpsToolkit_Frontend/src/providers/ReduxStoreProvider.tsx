import React from 'react';
import { Provider } from 'react-redux';
import { reduxStore } from '../store/redux';

const ReduxStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <Provider store={reduxStore}>{children}</Provider>;
};

export default ReduxStoreProvider;
