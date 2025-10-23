{
  config,
  lib,
  perSystem,
  ...
}:

let
  moduleName = "linakcontroller";

  cfg = config.services."${moduleName}";
in

{
  options.services."${moduleName}" = {
    enable = lib.mkEnableOption moduleName;

    macAddress = lib.mkOption {
      description = "The Bluetooth MAC address of the desk to connect to.";
      type = lib.types.strMatching "([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}";
      example = "ab:ab:ab:ab:ab:ab";
    };

    baseHeight = lib.mkOption {
      description = "The base height i.e. the height of the desk when in its lowest position in millimeters above the floor.";
      type = lib.types.nullOr lib.types.ints.unsigned;
      default = null;
      defaultText = "automatically get from desk";
      example = 640;
    };

    maxHeight = lib.mkOption {
      description = "The highest position of the desk that should be controllable in millimeters above the floor.";
      type = lib.types.nullOr lib.types.ints.unsigned;
      default = null;
      defaultText = "baseHeight + 10";
      example = 1100;
    };

    adapterName = lib.mkOption {
      description = "The name of the Bluetooth adapter to use for sending commands to the desk. Currently unused.";
      type = lib.types.singleLineStr;
      default = "hci0";
    };

    scanTimeout = lib.mkOption {
      description = "Currently unused.";
      type = lib.types.ints.unsigned;
      default = 5;
    };

    connectionTimeout = lib.mkOption {
      description = "Currently unused.";
      type = lib.types.ints.unsigned;
      default = 10;
    };

    serverAddress = lib.mkOption {
      description = "The server address the HTTP API should listen to.";
      type = lib.types.singleLineStr;
      default = "127.0.0.1";
      example = "0.0.0.0";
    };

    serverPort = lib.mkOption {
      description = "The port the HTTP API should bind to.";
      type = lib.types.port;
      default = 9123;
    };

    moveCommandPeriod = lib.mkOption {
      description = "How many seconds to wait/sleep between raw Bluetooth commands sent to the desk.";
      type = lib.types.numbers.nonnegative;
      default = 0.4;
    };

    debug = lib.mkOption {
      description = "Whether to print debug log.";
      type = lib.types.bool;
      default = false;
    };

    webhookPutHeight = lib.mkOption {
      description = "URL to send PUT requests with a body of the current desk height in millimeters above the floor to.";
      type = lib.types.nullOr lib.types.singleLineStr;
      default = null;
      defaultText = "no PUT requests are sent anywhere";
      example = "http://localhost:8080/rest/items/DeskHeight/state";
    };

    webhookPutHeightHeaders = lib.mkOption {
      description = "Additional headers to use when sending PUT requests. This can be used, i.e., for adding authorization headers.";
      type = lib.types.attrsOf lib.types.singleLineStr;
      default = { };
      example = {
        "Content-Type" = "text/plain";
        "Authorization" = "Basic something";
      };
    };

    allowDownwardMovement = lib.mkOption {
      description = "Whether to allow remote control of downward movement of the desk. If this is set to false, commands for heights that are lower than the current height will be ignored.";
      type = lib.types.bool;
      default = true;
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services."${moduleName}" = {
      # [Unit]
      requires = [ "bluetooth.target" ];

      # [Service]
      environment = {
        LC_MAC_ADDRESS = cfg.macAddress;
        LC_BASE_HEIGHT = lib.mkIf (cfg.baseHeight != null) (builtins.toString cfg.baseHeight);
        LC_MAX_HEIGHT = lib.mkIf (cfg.maxHeight != null) (builtins.toString cfg.maxHeight);
        LC_ADAPTER_NAME = cfg.adapterName;
        LC_SCAN_TIMEOUT = builtins.toString cfg.scanTimeout;
        LC_CONNECTION_TIMEOUT = builtins.toString cfg.connectionTimeout;
        LC_SERVER_ADDRESS = cfg.serverAddress;
        LC_SERVER_PORT = builtins.toString cfg.serverPort;
        LC_MOVE_COMMAND_PERIOD = lib.strings.floatToString cfg.moveCommandPeriod;
        LC_DEBUG = lib.trivial.boolToString cfg.debug;
        LC_WEBHOOK_PUT_HEIGHT = lib.mkIf (cfg.webhookPutHeight != null) cfg.webhookPutHeight;
        LC_WEBHOOK_PUT_HEIGHT_HEADERS = lib.mkIf (cfg.webhookPutHeightHeaders != { }) (
          builtins.toJSON cfg.webhookPutHeightHeaders
        );
        LC_ALLOW_DOWNWARD_MOVEMENT = lib.trivial.boolToString cfg.allowDownwardMovement;
      };
      script = "${lib.getExe perSystem.linak-controller.default}";
      serviceConfig.Restart = "always";

      # [Install]
      wantedBy = [ "multi-user.target" ];
    };

    hardware.bluetooth.enable = true;

    networking.firewall.allowedTCPPorts = lib.mkIf (cfg.serverAddress == "0.0.0.0") [ cfg.serverPort ];
  };
}
