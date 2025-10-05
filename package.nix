{ pkgs, ... }:

let
  pname = "linak-controller";
  version = "2.0.0";

  nodejs = pkgs.nodejs_22;
in

pkgs.writeShellApplication {
  name = pname;

  runtimeInputs = [ nodejs ];

  text = "node ${
    pkgs.buildNpmPackage {
      inherit pname version nodejs;

      src = ./.;

      npmDeps = pkgs.importNpmLock {
        npmRoot = ./.;
      };

      npmConfigHook = pkgs.importNpmLock.npmConfigHook;
    }
  }/lib/node_modules/linak-controller/dist/main.js";
}
