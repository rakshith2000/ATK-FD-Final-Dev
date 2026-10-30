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

# Install GCC, Python dev headers, PostgreSQL dev headers
case "$OS" in
    ubuntu|debian)
        sudo apt update
        sudo apt install -y build-essential python3-dev python3-pip libpq-dev
        ;;
    fedora)
        sudo dnf install -y gcc gcc-c++ python3-devel python3-pip postgresql-devel
        ;;
    centos|rhel)
        sudo yum install -y gcc gcc-c++ python3-devel python3-pip postgresql-devel
        ;;
    arch)
        sudo pacman -Sy --noconfirm gcc python-pip python-dev postgresql-libs
        ;;
    opensuse*|suse)
        sudo zypper install -y gcc python3-devel python3-pip postgresql-devel
        ;;
    *)
        echo "Unsupported or unknown Linux distribution: $OS"
        exit 1
        ;;
esac

echo "Installation complete."
