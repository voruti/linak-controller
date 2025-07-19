{ pkgs }:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_22
  ];

  shellHook = ''
    git fetch --all --tags --prune || true
    echo
    git status
  '';
}
