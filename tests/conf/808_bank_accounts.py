# A small bank-account class hierarchy with custom exceptions
class BankError(Exception):
    pass
class InvalidAmount(BankError):
    pass
class InsufficientFunds(BankError):
    def __init__(self, balance, amount):
        super().__init__(f"cannot withdraw {amount}, balance is {balance}")
        self.shortfall = amount - balance
class Account:
    count = 0
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance
        self.history = []
        Account.count += 1
    @property
    def balance(self):
        return self._balance
    def available(self):
        return self._balance
    def deposit(self, amount):
        if amount <= 0:
            raise InvalidAmount(f"deposit must be positive, got {amount}")
        self._balance += amount
        self.history.append(("deposit", amount))
    def withdraw(self, amount):
        if amount > self.available():
            raise InsufficientFunds(self._balance, amount)
        self._balance -= amount
        self.history.append(("withdraw", amount))
    def __str__(self):
        return f"{type(self).__name__}({self.owner}: {self._balance:.2f})"
class Savings(Account):
    def __init__(self, owner, balance=0, rate=0.02):
        super().__init__(owner, balance)
        self.rate = rate
    def add_interest(self):
        interest = round(self._balance * self.rate, 2)
        self.deposit(interest)
        return interest
class Checking(Account):
    overdraft = 100
    def available(self):
        return self._balance + self.overdraft
def transfer(source, target, amount):
    source.withdraw(amount)
    target.deposit(amount)
ann = Savings("Ann", 1000)
bob = Checking("Bob", 50)
print(ann, "|", bob, "| accounts:", Account.count)
print("interest:", ann.add_interest(), ann.balance)
transfer(ann, bob, 200)
print("after transfer:", ann, "|", bob)
bob.withdraw(300)
print("overdraft allowed:", bob, bob.available())
for action, args in [(bob.withdraw, (100,)), (ann.deposit, (-5,)), (transfer, (bob, ann, 10 ** 6))]:
    try:
        action(*args)
    except InsufficientFunds as e:
        print("InsufficientFunds:", e, "| short by", e.shortfall)
    except BankError as e:
        print(type(e).__name__ + ":", e)
print("history:", ann.history, bob.history)
accounts = [ann, bob, Savings("Cy", 300, rate=0.05)]
print("total:", sum(a.balance for a in accounts), "| richest:", max(accounts, key=lambda a: a.balance).owner)
print("types:", [type(a).__name__ for a in accounts], [isinstance(a, Savings) for a in accounts])
print("sorted:", [str(a) for a in sorted(accounts, key=lambda a: a.balance)])
