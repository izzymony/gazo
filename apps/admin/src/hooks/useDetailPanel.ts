import { useState, useCallback } from 'react';

export type PanelType = 'user' | 'order' | 'product' | 'business' | 'withdrawal' | 'shipment';

interface PanelState {
  isOpen: boolean;
  type: PanelType | null;
  id: string | null;
}

export function useDetailPanel() {
  const [panelState, setPanelState] = useState<PanelState>({
    isOpen: false,
    type: null,
    id: null
  });

  const openPanel = useCallback((type: PanelType, id: string) => {
    setPanelState({
      isOpen: true,
      type,
      id
    });
  }, []);

  const closePanel = useCallback(() => {
    setPanelState({
      isOpen: false,
      type: null,
      id: null
    });
  }, []);

  const isCurrentPanel = useCallback((type: PanelType, id: string) => {
    return panelState.isOpen && panelState.type === type && panelState.id === id;
  }, [panelState]);

  return {
    ...panelState,
    openPanel,
    closePanel,
    isCurrentPanel
  };
}