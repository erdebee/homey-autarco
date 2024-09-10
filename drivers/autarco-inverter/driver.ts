import Homey from 'homey';

class AutarcoInverterDriver extends Homey.Driver {
  async onInit() {
    const { default: fetch } = await import('node-fetch');
    this.log('AutarcoInverterDriver has been initialized');
  }

  async onPair(session: any) {
    let username: string;
    let password: string;
    let sites: Array<{ name: string; value: string }> = [];

    session.setHandler('login', async (data: { username: string; password: string }) => {
      try {
        const { default: fetch } = await import('node-fetch');
        username = data.username;
        password = data.password;
        this.log('Logging in with username:', username);
        const response = await fetch('https://my.autarco.com/api/site', {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
          },
        });

        this.log('Login response:', response);

        if (!response.ok) {
          throw new Error('Login failed');
        }
        
        const jsonResponse = await response.json() as { data?: unknown[] };
        this.log('JSON response:', jsonResponse);
        if (!jsonResponse.data || !Array.isArray(jsonResponse.data)) {
          throw new Error('Invalid response format');
        }
        sites = jsonResponse.data.map((site: unknown) => {
          const typedSite = site as { address_line_1: string; city: string; public_key: string };
          return {
            name: `${typedSite.address_line_1}, ${typedSite.city}`,
            value: typedSite.public_key,
          };
        });
        this.log('Sites:', sites);
        return { success: true, sites };
      } catch (error) {
        this.error('Login error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
      }
    });

    session.setHandler('list_devices', async () => {
      return sites.map(site => ({
        name: site.name,
        data: {
          id: site.value,
        },
        store: {
          username,
          password,
          siteId: site.value,
        },
      }));
    });

    // Remove the 'add_device' handler from login.html as it's not needed anymore
  }
}

module.exports = AutarcoInverterDriver;