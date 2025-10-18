{ pkgs, ... }:

let
  inherit (pkgs) lib;

  pname = "linak-controller";
  version = "2.0.0";

  nodejs = pkgs.nodejs_22;
in

pkgs.writeShellApplication {
  name = "${pname}-bin-${version}";

  runtimeInputs = [ nodejs ];

  text = "node ${
    pkgs.buildNpmPackage {
      inherit pname version nodejs;

      src = lib.sources.cleanSourceWith {
        src = lib.sources.cleanSource ./.;
        filter =
          name: _type:
          (builtins.any (x: x) [
            ((builtins.match ".*/src.*" name) == [ ])
            (lib.hasSuffix "/package-lock.json" name)
            (lib.hasSuffix "/package.json" name)
            (lib.hasSuffix "/tsconfig.json" name)
          ]);
      };

      npmDeps = pkgs.importNpmLock { npmRoot = ./.; };

      npmConfigHook = pkgs.importNpmLock.npmConfigHook;
    }
  }/lib/node_modules/linak-controller/dist/main.js";
}
