{ pkgs, ... }:

pkgs.buildNpmPackage {
  pname = "linak-controller";
  version = "2.0.0";

  nodejs = pkgs.nodejs_22;

  src = ./.;

  npmDeps = pkgs.importNpmLock {
    npmRoot = ./.;
  };

  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
}
