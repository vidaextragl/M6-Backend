export interface ExchangeRateProvider {
  name: string;
  getRate(from: string, to: string): Promise<number>;
}
