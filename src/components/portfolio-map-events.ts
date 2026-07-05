export const PORTFOLIO_MARKER_SELECT_EVENT = 'sp:portfolio-marker-select';
export const PORTFOLIO_CARD_ACTIVE_EVENT = 'sp:portfolio-card-active';

export type PortfolioPropertyEventDetail = {
  propertyId: string;
  source?: 'map' | 'scroll';
};
