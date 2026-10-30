#!/bin/bash

echo "Detecting Linux distribution..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. /etc/os-release not found."
    exit 1
fi

echo "Detected OS: $OS"

# Install PostgreSQL 17 and dependencies
case "$OS" in
    ubuntu|debian)
        sudo apt update
        sudo apt install -y wget gnupg lsb-release curl build-essential git
        echo "Adding PostgreSQL APT repository..."
        echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
        sudo apt update
        sudo apt install -y postgresql-17 postgresql-server-dev-17
        ;;
    fedora)
        sudo dnf install -y postgresql17-server postgresql17-contrib git make gcc
        ;;
    centos|rhel)
        sudo yum install -y postgresql17-server postgresql17-contrib git make gcc
        ;;
    arch)
        sudo pacman -Sy --noconfirm postgresql git base-devel
        ;;
    opensuse*|suse)
        sudo zypper install -y post17-contrib git make gcc
        ;;
    *)
        echo "Unsupported or unknown Linux distribution: $OS"
        exit 1
        ;;
esac

echo "Initializing PostgreSQL database..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
else
    sudo postgresql-setup initdb
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi

echo "Installing pgvector v0.8.1 from source..."
cd /tmp
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
cd ..
rm -rf pgvector

echo "Creating pgvector extension..."
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Create a Database
sudo -u postgres psql -c "CREATE DATABASE itopstoolkit_db;"

echo "Setting password for postgres user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'StrongPassword123';"

echo "Configuring PostgreSQL to allow password authentication..."

PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW hba_file")
POSTGRESQL_CONF=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW config_file")

# Force password authentication for all connections
sudo sed -i "s/^local\s\+all\s\+postgres\s\+peer/local all postgres md5/" "$PG_HBA"
sudo sed -i "s/^local\s\+all\s\+all\s\+peer/local all all md5/" "$PG_HBA"
grep -q "^local\s\+all\s\+all\s\+md5" "$PG_HBA" || echo "local all all md5" | sudo tee -a "$PG_HBA"
grep -q "127.0.0.1/32.*md5" "$PG_HBA" || echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a "$PG_HBA"
grep -q "0.0.0.0/0.*md5" "$PG_HBA" || echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a "$PG_HBA"

# Listen on all IP addresses
sudo sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$POSTGRESQL_CONF"

echo "Restarting PostgreSQL service..."
sudo systemctl restart postgresql

echo "PostgreSQL 17 and pgvector v0.8.1 installation complete."
echo "Password authentication is now enforced for all connections."
echo "Please change the default password for postgres (currently: StrongPassword123)."
