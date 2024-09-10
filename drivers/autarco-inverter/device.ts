import Homey from 'homey';

class AutarcoInverterDevice extends Homey.Device {
  private pollInterval: NodeJS.Timeout | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private siteId: string | null = null;

  async onInit() {
    this.log('AutarcoInverterDevice has been initialized');

    this.username = this.getStoreValue('username');
    this.password = this.getStoreValue('password');
    this.siteId = this.getStoreValue('siteId');

    await this.addCapability('measure_power');
    await this.addCapability('meter_power'); // Add this line to include the new energy capability

    this.pollInterval = this.homey.setInterval(this.pollData.bind(this), 300000); // Poll every 5 minutes
    await this.pollData(); // Initial poll
  }

  async pollData() {
    await Promise.all([
      this.pollPower(),
      this.pollEnergy()
    ]);
  }

  async pollPower() {
    if (!this.username || !this.password || !this.siteId) {
      this.error('Missing username, password, or site ID');
      return;
    }

    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`https://my.autarco.com/api/site/${this.siteId}/power`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch power data');
      }
      const data = await response.json() as { 
        stats: { 
          kpis: { 
            pv_now: number 
            
          } 
        } 
      };
      const power = data.stats.kpis.pv_now;

      await this.setCapabilityValue('measure_power', power);
      this.log(`Updated power: ${power} W`);
    } catch (error) {
      this.error('Failed to fetch power data:', error);
    }
  }

  async pollEnergy() {
    if (!this.username || !this.password || !this.siteId) {
      this.error('Missing username, password, or site ID');
      return;
    }

    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`https://my.autarco.com/api/site/${this.siteId}/energy`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch energy data');
      }
      
      const data = await response.json() as { 
        stats: { 
          kpis: { 
            pv_to_date: number 
          } 
        } 
      };
      
      const energy = data.stats.kpis.pv_to_date;

      if (typeof energy !== 'number') {
        throw new Error('Invalid energy data received');
      }

      await this.setCapabilityValue('meter_power', energy);
      this.log(`Updated energy: ${energy} kWh`);
    } catch (error) {
      this.error('Failed to fetch energy data:', error);
    }
  }

  // ... other methods ...
}

module.exports = AutarcoInverterDevice;