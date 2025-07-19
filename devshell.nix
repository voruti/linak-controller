{ pkgs }:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_22
    python3 # for @abandonware/noble
  ];

  shellHook = ''
    git fetch --all --tags --prune || true
    echo
    git status
  '';
}
